'use strict';

/**
 * Handles the specific SSO (Single Sign-On) flow for Tamkang University (TKU).
 * TKU uses a custom gateway that hides a Captcha and requires multi-step redirection.
 */
class TkuSsoFlow {
  /**
   * @param {import('./agent').CampusNetworkAgent} agent 
   */
  constructor(agent) {
    this.agent = agent;
    this.logger = agent.logger;
  }

  /**
   * Executes the TKU SSO Login flow.
   * @param {string} username 
   * @param {string} password 
   */
  async execute(username, password) {
    this.logger.info('[TKU-SSO] Initiating Tamkang University SSO flow...');
    
    // Step 1: Request the TronClass login entry point.
    // In modern TKU TronClass, it's an OIDC flow via Keycloak protected by WebSEAL.
    const entryUrl = `${this.agent.baseUrl}/login?next=/iportal&locale=zh_TW`;
    
    this.logger.debug(`[TKU-SSO] Fetching entry point: ${entryUrl}`);
    const entryRes = await this.agent.request(entryUrl);
    
    // This should redirect to Keycloak: https://sso.tku.edu.tw/auth/...
    let keycloakUrl = entryUrl;
    if (entryRes.status === 302 || entryRes.status === 301) {
      keycloakUrl = entryRes.headers.get('location');
    }
    
    this.logger.debug(`[TKU-SSO] Fetching SSO gate: ${keycloakUrl}`);
    const ssoPageRes = await this.agent.request(keycloakUrl);
    let ssoHtml = await ssoPageRes.text();
    let websealFormUrl = keycloakUrl;

    // If it's a JS redirect (WebSEAL sometimes does this)
    // In WebSEAL's HTML, it does: window.location.href="...logineb.jsp?myurl=" + redirUrl;
    const jsRedirectMatch = ssoHtml.match(/window\.location\.href\s*=\s*["']([^"']+)["']\s*\+\s*redirUrl/i);
    if (jsRedirectMatch) {
      const realSsoUrl = jsRedirectMatch[1] + encodeURIComponent(keycloakUrl);
      this.logger.debug(`[TKU-SSO] Following WebSEAL JS redirect to: ${realSsoUrl}`);
      const jsRes = await this.agent.request(realSsoUrl);
      ssoHtml = await jsRes.text();
      websealFormUrl = realSsoUrl;
    }

    // Step 2: Extract form action and jsessionid from WebSEAL form
    const actionMatch = ssoHtml.match(/<form[^>]+action="([^"]+login2\.do[^"]*)"/i);
    if (!actionMatch) {
      throw new Error('Could not find TKU SSO form action url. The authentication flow might have changed.');
    }
    const formAction = actionMatch[1].startsWith('http') 
      ? actionMatch[1] 
      : `https://sso.tku.edu.tw${actionMatch[1]}`;

    // Extract hidden fields (myurl, ln, embed, vkb, logintype)
    const hiddenInputs = {};
    const inputRegex = /<input\s+type="hidden"\s+id="([^"]+)"\s+name="([^"]+)"\s+value="([^"]*)"/gi;
    let match;
    while ((match = inputRegex.exec(ssoHtml)) !== null) {
      hiddenInputs[match[2]] = match[3];
    }
    
    // WebSEAL login2.do uses this myurl field to decide where to redirect after login.
    // We MUST override it with the Keycloak URL, otherwise it sends us to www.tku.edu.tw!
    hiddenInputs['myurl'] = keycloakUrl;

    // Step 3: Exploit the SSO API to get the hidden Captcha (vidcode)
    this.logger.info('[TKU-SSO] Fetching hidden verification code (Captcha bypass)...');
    
    // TKU requires the image to be "loaded" to initialize the captcha session
    await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'GET',
      headers: { 'Referer': websealFormUrl }
    });

    // Then initialize the voice flow
    await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': websealFormUrl,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'outType=1'
    });

    const validateRes = await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': websealFormUrl,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'outType=2'
    });
    const vidcode = (await validateRes.text()).trim();
    
    if (!vidcode) {
      throw new Error('Failed to fetch TKU vidcode.');
    }
    this.logger.debug(`[TKU-SSO] Captured vidcode: ${vidcode}`);

    // Step 4: Submit the login form
    this.logger.info('[TKU-SSO] Submitting credentials to SSO gateway...');
    const formData = new URLSearchParams();
    for (const [k, v] of Object.entries(hiddenInputs)) {
      formData.append(k, v);
    }
    formData.append('username', username);
    formData.append('password', password);
    formData.append('vidcode', vidcode);
    formData.append('loginbtn', '登入');

    const submitRes = await this.agent.request(formAction, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': websealFormUrl
      },
      body: formData.toString()
    });

    // Step 5: Handle Redirection back to Tronclass
    let redirectUrl = null;
    
    if (submitRes.status === 302 || submitRes.status === 301) {
      redirectUrl = submitRes.headers.get('location');
    } else if (submitRes.status === 200) {
      const html = await submitRes.text();
      // TKU returns a 200 OK with a javascript redirect on success
      if (html.includes('Login Successfully')) {
        const scriptMatch = html.match(/window\.location\.href="([^"]+)"/);
        if (scriptMatch) {
          redirectUrl = scriptMatch[1];
        } else {
          // If no script redirect is found but login succeeded, we fallback to the hidden myurl
          redirectUrl = hiddenInputs['myurl'];
        }
      } else {
        throw new Error('TKU SSO rejected credentials. Check your username/password.');
      }
    } else {
      throw new Error(`Unexpected TKU SSO response status: ${submitRes.status}`);
    }

    if (redirectUrl) {
      // Clean up encoded HTML entities in the URL if any
      redirectUrl = redirectUrl.replace(/&amp;/g, '&');
      this.logger.info(`[TKU-SSO] SSO Login success! Following OIDC flow to: ${redirectUrl}`);
      
      // TKU's WebSEAL eaido.jsp sets the PD-ID cookie and redirects to an arbitrary page
      await this.agent.request(redirectUrl);
      
      this.logger.debug(`[TKU-SSO] Restarting Keycloak OIDC flow with active WebSEAL session...`);
      // Now that we are authenticated with WebSEAL, fetching the Keycloak URL will pass through
      // Keycloak will then bounce us to iclass.tku.edu.tw/login?code=...
      let finalRes = await this.agent.request(keycloakUrl);
      let loopCount = 0;
      
      // Follow the redirect chain (keycloak -> iclass login -> iclass dashboard)
      while (loopCount < 10 && [301, 302].includes(finalRes.status)) {
        const loc = finalRes.headers.get('location');
        this.logger.debug(`[TKU-SSO] Redirect bounce: ${loc}`);
        if (!loc) break;
        
        const nextUrl = loc.startsWith('http') ? loc : `https://iclass.tku.edu.tw${loc}`;
        finalRes = await this.agent.request(nextUrl);
        loopCount++;
      }
      
      this.logger.debug(`[TKU-SSO] Final Res status: ${finalRes.status}, URL: ${finalRes.url}`);
      
      // If the last step is a JS redirect (sometimes happens on Tronclass)
      if (finalRes.status === 200) {
        const finalHtml = await finalRes.text();
        const refreshMatch = finalHtml.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) || finalHtml.match(/url='?([^'">]+)'?/i);
        if (refreshMatch) {
          const nextUrl = refreshMatch[1].startsWith('http') ? refreshMatch[1] : `https://iclass.tku.edu.tw${refreshMatch[1]}`;
          this.logger.debug(`[TKU-SSO] Following nested JS redirect to: ${nextUrl}`);
          finalRes = await this.agent.request(nextUrl);
        }
      }
      
      // Verify if we are now authenticated on Tronclass
      const dashboardRes = await this.agent.request(this.agent.endpoints.dashboard());
      if (dashboardRes.status === 200 && !dashboardRes.url.includes('/login')) {
        this.logger.info('[TKU-SSO] Successfully authenticated to TronClass via SSO.');
        return true;
      }
      throw new Error('TKU SSO completed, but TronClass rejected the session.');
    }
  }
}

module.exports = {
  TkuSsoFlow
};
