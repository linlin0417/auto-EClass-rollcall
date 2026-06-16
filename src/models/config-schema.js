'use strict';

const {
  NUMBER_WORKER_COUNT,
  NUMBER_MIN_WORKER_COUNT,
  NUMBER_REQUEST_RETRIES,
  NUMBER_COOLDOWN_SECONDS,
  NUMBER_MAX_COOLDOWNS,
  NUMBER_TRANSIENT_FAILURE_THRESHOLD,
  NUMBER_TRANSIENT_FAILURE_RATIO,
  DEFAULT_HTTP_TIMEOUT_SECONDS,
  DEFAULT_NOTIFICATION_TIMEOUT_SECONDS,
  DEFAULT_OPERATING_RANGE,
  DEFAULT_USER_AGENTS,
} = require('../core/constants');

/**
 * Build the default configuration structure.
 * Needs to be a function because it references provider_registry_config()
 * which is defined in providers/index.js (lazy-loaded to avoid circular deps).
 * @returns {Object}
 */
function buildDefaultConfig() {
  // Lazy-require to avoid circular dependency
  let providerRegistryConfig;
  try {
    providerRegistryConfig = require('../providers/index').providerRegistryConfig;
  } catch {
    providerRegistryConfig = () => ({ current: 'thu', allow_experimental: false, available: {} });
  }

  let normalizeResearchModeConfig;
  try {
    normalizeResearchModeConfig = require('../research/mode').normalizeResearchModeConfig;
  } catch {
    normalizeResearchModeConfig = () => ({ enabled: false, sandbox: false, probe_enabled: false });
  }

  const DEFAULT_BOUNDARY_POINTS = [
    [24.174503, 120.611990],
    [24.183279, 120.613658],
    [24.181276523213068, 120.5937236680773],
    [24.17735264149224, 120.59779550644511],
  ];

  return {
    account: {
      user: 'YOUR_STUDENT_ID',
      passwd: 'YOUR_PASSWORD',
    },
    teacher: {
      user: '',
      passwd: '',
      school: 'tronclass',
      course: '',
    },
    accounts: {
      current: 'default',
      profiles: {
        default: {
          user: 'YOUR_STUDENT_ID',
          passwd: 'YOUR_PASSWORD',
          label: 'legacy config',
          school: 'thu',
        },
      },
    },
    provider: providerRegistryConfig(),
    session: {
      cache_cookies: true,
    },
    auth: {
      browser_assisted_login: {
        enabled: false,
        headless: true,
        timeout_ms: 45000,
      },
    },
    ux: {
      pending_qr_ttl_seconds: 600,
      debug_bundle_log_limit: 50,
    },
    monitor: {
      ignore_attendance_rate_gate: false,
    },
    local_ui: {
      host: '127.0.0.1',
      port: 8765,
    },
    webview: {
      cookie_sync: {
        enabled: false,
        allow_cookie_import: false,
        allowed_domains: [],
        cookie_name_allowlist: ['session'],
        allow_experimental_provider: false,
      },
    },
    integrations: {
      discord: {
        enable: false,
        token_env: 'DISCORD_BOT_TOKEN',
        channel_env: 'DISCORD_CHANNEL_ID',
        public_key_env: 'DISCORD_PUBLIC_KEY',
        application_id_env: 'DISCORD_APPLICATION_ID',
        guild_id_env: 'DISCORD_GUILD_ID',
        ephemeral_replies: true,
      },
      line: {
        enable: false,
        token_env: 'LINE_CHANNEL_ACCESS_TOKEN',
        secret_env: 'LINE_CHANNEL_SECRET',
      },
      telegram: {
        enable: false,
        token_env: 'TELEGRAM_BOT_TOKEN',
        chat_env: 'TELEGRAM_CHAT_ID',
      },
      admins: {
        discord: [],
        line: [],
      },
      security: {
        allowed_channels: {
          discord: [],
          line: [],
        },
        dangerous_cooldown_seconds: 30,
        audit_log: true,
      },
      bindings: {},
    },
    notifications: {
      tg: { enable: false, key: '', chat: '' },
      dc: { enable: false, key: '', chat: '' },
    },
    config: {
      enable_log: true,
      Senkaku: 1,
      retries: 20,
      http_timeout: DEFAULT_HTTP_TIMEOUT_SECONDS,
      notification_timeout: DEFAULT_NOTIFICATION_TIMEOUT_SECONDS,
      verify_ssl: true,
      'user-agent': [...DEFAULT_USER_AGENTS],
    },
    time: {
      timezone: 'Asia/Taipei',
    },
    number: {
      concurrency: NUMBER_WORKER_COUNT,
      min_concurrency: NUMBER_MIN_WORKER_COUNT,
      request_retries: NUMBER_REQUEST_RETRIES,
      cooldown_seconds: NUMBER_COOLDOWN_SECONDS,
      max_cooldowns: NUMBER_MAX_COOLDOWNS,
      transient_failure_threshold: NUMBER_TRANSIENT_FAILURE_THRESHOLD,
      transient_failure_ratio: NUMBER_TRANSIENT_FAILURE_RATIO,
      direct_code_lookup: {
        enabled: true,
        fallback_bruteforce: true,
      },
    },
    radar: {
      strategy: 'empty_answer',
      empty_answer_fallback_enabled: true,
      boundary_points: DEFAULT_BOUNDARY_POINTS.map(p => [...p]),
      allow_outside_probe: true,
      outside_scale: 1.6,
      max_distance_probes: 4,
      max_final_attempts: 100,
      final_grid_step_meters: 100.0,
      final_grid_radius_meters: 20.0,
      global: {
        max_queries: 120,
        request_retries: NUMBER_REQUEST_RETRIES,
        cooldown_seconds: NUMBER_COOLDOWN_SECONDS,
        max_cooldowns: NUMBER_MAX_COOLDOWNS,
        transient_failure_threshold: NUMBER_TRANSIENT_FAILURE_THRESHOLD,
        transient_failure_ratio: NUMBER_TRANSIENT_FAILURE_RATIO,
        anchor_count: 12,
        bearing_count: 12,
        standard_radii_meters: [10000.0, 3000.0, 1000.0, 300.0, 100.0],
        supplement_radii_meters: [300.0, 100.0, 30.0],
        standard_query_count: 72,
        supplement_query_count: 36,
        present_hint_verify_enabled: true,
        adaptive_estimate_enabled: true,
        target_uncertainty_95_meters: 35.0,
        robust_f_scale_meters: 50.0,
        measurement_sigma_meters: 0.289,
        max_pattern_iterations: 220,
        max_lm_iterations: 60,
      },
    },
    research: normalizeResearchModeConfig({}),
    operating: Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [i, { enable: true, range: [...DEFAULT_OPERATING_RANGE] }])
    ),
  };
}

module.exports = { buildDefaultConfig };
