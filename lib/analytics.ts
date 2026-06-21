import posthog from 'posthog-js';

export type AnalyticsEvent =
  // ── Existing events ────────────────────────────────────────────────────────
  | { name: 'landing_page_view'; properties?: { signup_source?: string; referral_code?: string } }
  | { name: 'signup_started'; properties?: { signup_source?: string; referral_code?: string } }
  | { name: 'signup_completed'; properties: { email?: string; signup_source?: string; referral_code?: string } }
  | { name: 'portfolio_created'; properties: { source: 'plaid' | 'manual' | 'demo' | 'cams'; asset_count: number } }
  | { name: 'first_stock_added'; properties: { symbol: string; asset_class: string } }
  | { name: 'ai_insight_viewed'; properties: { insight_id: string; insight_type: string } }
  | { name: 'weekly_summary_clicked'; properties: { medium: 'email' | 'push'; cohort_week: string } }
  | { name: 'returned_next_day'; properties?: Record<string, any> }
  // ── Auth page events ───────────────────────────────────────────────────────
  /** User landed on /auth */
  | { name: 'auth_page_viewed'; properties?: { referrer?: string } }
  /** User submitted email in Step 1 */
  | { name: 'auth_email_submitted'; properties: { email_domain: string } }
  /** Backend confirmed email exists → Login step shown */
  | { name: 'auth_existing_user_detected'; properties: { email_domain: string } }
  /** Backend confirmed email is new → Register step shown */
  | { name: 'auth_new_user_detected'; properties: { email_domain: string } }
  /** Email check failed (network / API error) */
  | { name: 'auth_email_check_failed'; properties: { reason: string } }
  /** User successfully signed in */
  | { name: 'auth_login_success'; properties: { method: 'email' } }
  /** Login attempt failed */
  | { name: 'auth_login_failed'; properties: { method: 'email'; reason: string } }
  /** User successfully created a new account */
  | { name: 'auth_register_success'; properties: { method: 'email' } }
  /** Registration attempt failed */
  | { name: 'auth_register_failed'; properties: { method: 'email'; reason: string } }
  /** User clicked "Continue with Google" */
  | { name: 'auth_google_clicked'; properties?: { step?: 'email' } }
  /** User clicked "Use a different email or Google" — went back to Step 1 */
  | { name: 'auth_back_clicked'; properties: { from_step: 'login' | 'register' } }
  /** User clicked "Try Demo Account" */
  | { name: 'auth_demo_clicked'; properties?: Record<string, never> };

class AnalyticsService {
  private isInitialized = false;

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!key) {
      console.warn('PostHog Key missing. Analytics disabled in this session.');
      return;
    }

    posthog.init(key, {
      api_host: host,
      persistence: 'cookie',
      cross_subdomain_cookie: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
      autocapture: false,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
        }
      },
    });

    this.isInitialized = true;
  }

  identifyUser(userId: string, email: string, traits?: Record<string, any>) {
    if (typeof window === 'undefined') return;
    posthog.identify(userId, {
      email,
      ...traits,
    });
  }

  reset() {
    if (typeof window === 'undefined') return;
    posthog.reset();
  }

  track(event: AnalyticsEvent) {
    if (typeof window === 'undefined') return;

    const deviceProperties = {
      $screen_width: window.innerWidth,
      $screen_height: window.innerHeight,
      userAgent: navigator.userAgent,
    };

    posthog.capture(event.name, {
      ...deviceProperties,
      ...event.properties,
    });
  }
}

export const analytics = new AnalyticsService();
