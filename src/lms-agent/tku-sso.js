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
    
    // Step 1: Request the SSO Gateway page
    // The target we want to eventually be authenticated for
    const targetUrl = `${this.agent.baseUrl}/user/login`;
    const ssoUrl = `https://sso.tku.edu.tw/NEAI/logineb.jsp?myurl=${encodeURIComponent(targetUrl)}`;
    
    this.logger.debug(`[TKU-SSO] Fetching SSO form from: ${ssoUrl}`);
    const ssoPageRes = await this.agent.request(ssoUrl);
    const ssoHtml = await ssoPageRes.text();

    // Step 2: Extract form action and jsessionid
    const actionMatch = ssoHtml.match(/<form[^>]+action="([^"]+login2\.do[^"]*)"/i);
    if (!actionMatch) {
      throw new Error('Could not find TKU SSO form action url.');
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
    // Ensure myurl is set to what we want
    hiddenInputs['myurl'] = targetUrl;

    // Step 3: Exploit the SSO API to get the hidden Captcha (vidcode)
    this.logger.info('[TKU-SSO] Fetching hidden verification code (Captcha bypass)...');
    
    // TKU requires the image to be "loaded" to initialize the captcha session
    await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'GET',
      headers: { 'Referer': ssoUrl }
    });

    // Then initialize the voice flow
    await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': ssoUrl,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'outType=1'
    });

    const validateRes = await this.agent.request('https://sso.tku.edu.tw/NEAI/ImageValidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': ssoUrl,
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
        'Referer': ssoUrl
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
          // If no script redirect is found but login succeeded, fallback to myurl
          redirectUrl = targetUrl; 
        }
      } else {
        throw new Error('TKU SSO rejected credentials. Check your username/password.');
      }
    } else {
      throw new Error(`Unexpected TKU SSO response status: ${submitRes.status}`);
    }

    if (redirectUrl) {
      this.logger.info(`[TKU-SSO] SSO Login success! Redirecting to: ${redirectUrl}`);
      
      // Follow the redirect manually
      // TKU's eaido.jsp might bounce us a few times
      let finalRes = await this.agent.request(redirectUrl);
      
      // If eaido.jsp returns another JS redirect or meta refresh (sometimes happens)
      if (finalRes.status === 200) {
        const finalHtml = await finalRes.text();
        const refreshMatch = finalHtml.match(/url='?([^'">]+)'?/i);
        if (refreshMatch) {
          this.logger.debug(`[TKU-SSO] Following nested redirect to: ${refreshMatch[1]}`);
          finalRes = await this.agent.request(refreshMatch[1]);
        }
      }
      
      // Let's verify if we are now authenticated on Tronclass
      const dashboardRes = await this.agent.request(this.agent.endpoints.dashboard());
      if (!dashboardRes.url.includes('/login')) {
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
