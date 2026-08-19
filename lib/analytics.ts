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
  /** User successfully reactivated their account */
  | { name: 'auth_reactivation_success'; properties: { method: 'email' } }
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

    // Defensive polyfill for any webview/extension calling closeMobileMenu globally
    (window as any).closeMobileMenu = (window as any).closeMobileMenu || function () {};

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
      before_send: (event) => {
        if (event && event.event === '$exception') {
          const props = event.properties || {};
          const excType = String(props['$exception_type'] || props['$exception_name'] || '');
          const excValue = String(
            props['$exception_message'] ||
              props['$exception_value'] ||
              props['$exception_list']?.[0]?.value ||
              ''
          );

          // 1. Filter out cross-origin "Script error." (CORS policy masked errors)
          if (excValue === 'Script error.' || excValue === 'Script error') {
            return null;
          }

          // 2. Filter out Chrome Extension / WebView IPC non-error promise rejections
          if (
            excValue.includes('Object Not Found Matching Id') ||
            excValue.includes('Object captured as exception')
          ) {
            return null;
          }

          // 3. Filter out closeMobileMenu reference errors from third-party scripts/webviews
          if (excType === 'ReferenceError' && excValue.includes('closeMobileMenu')) {
            return null;
          }

          // 4. Filter out Google Translate & browser extension DOM reconciliation issues (DOMException / insertBefore)
          if (
            excType === 'DOMException' ||
            excValue.includes('The object can not be found here') ||
            excValue.includes('insertBefore')
          ) {
            return null;
          }

          // 5. Filter out ChunkLoadError (handled via auto-reload on stale Next.js deployments)
          if (excType === 'ChunkLoadError' || excValue.includes('Failed to load chunk')) {
            return null;
          }

          // 6. Filter out Android WebView Java native bridge garbage collection errors
          if (excValue.includes('Error invoking postMessage: Java object is gone')) {
            return null;
          }

          // 7. Filter out ResizeObserver frame loop notifications
          if (excValue.includes('ResizeObserver loop completed')) {
            return null;
          }
        }
        return event;
      },
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
