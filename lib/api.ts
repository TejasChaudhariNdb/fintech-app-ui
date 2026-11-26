const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// BUG-021: endpoints currently showing saved data because the server could not be reached.
// Screens subscribe (see subscribeToCacheState) so they can say so.
const servedFromCache = new Set<string>();

function publishCacheState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("arthavi-cache-state", { detail: { endpoints: Array.from(servedFromCache) } }),
  );
}

export function subscribeToCacheState(listener: (endpoints: string[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ endpoints: string[] }>).detail?.endpoints ?? []);
  };
  window.addEventListener("arthavi-cache-state", handler);
  return () => window.removeEventListener("arthavi-cache-state", handler);
}

type AIChatResponse = {
  response: string;
  session_id: number;
  session_title: string;
};

export type AIQuotaStatus = {
  remaining: number;
  limit: number;
  resets_at: string | null;
  resets_in_seconds: number;
  window_hours: number;
  show_warning: boolean;
};

export type RegularIncomePayload = {
  name: string;
  income_type: "PENSION" | "SALARY" | "ANNUITY" | "OTHER";
  amount: number;
  frequency: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY";
  start_date: string;
  end_date?: string | null;
  is_taxable: boolean;
  bank_account?: string | null;
  notes?: string | null;
  profile_id?: number | null;
};

export type RegularIncome = RegularIncomePayload & { id: number; owner: string };

export type CapitalGainRecord = {
  buy_tx_id?: number | null;
  sell_tx_id?: number | null;
  code: string;
  scrip: string;
  isin: string;
  asset_type: "MUTUAL_FUND" | "STOCK";
  tax_class: "EQUITY" | "DEBT" | "OTHER";
  rate_key: string;
  rate_label: string;
  long_term: boolean;
  gain_type: "LTCG" | "STCG";
  financial_year: string;
  bought_date: string;
  bought_qty: number;
  bought_rate: number;
  bought_value: number;
  sold_date: string;
  sold_qty: number;
  sold_rate: number;
  sold_value: number;
  fmv_2018_01_31: number | null;
  fmv_missing: boolean;
  cost_estimated: boolean;
  profit_loss: number;
  taxable_gain: number;
  holding_period: number;
};

export type FyTaxLine = {
  rate_key: string;
  label: string;
  long_term: boolean;
  equity: boolean;
  gain: number;
  after_set_off: number;
  taxable: number;
  tax: number | null; // null = slab rate not chosen
};

export type FyTaxSummary = {
  financial_year: string;
  lines: FyTaxLine[];
  st_loss: number;
  lt_loss: number;
  st_loss_carry_forward: number;
  lt_loss_carry_forward: number;
  equity_ltcg_exemption_limit: number;
  equity_ltcg_exemption_used: number;
  estimated_tax: number;
  slab_gain_taxable: number;
  slab_tax_included: boolean;
};

export type CapitalGainsSummary = {
  financial_year: string;
  total_trades: number;
  ltcg_count: number;
  stcg_count: number;
  total_ltcg: number;
  total_stcg: number;
  net_realized_gain: number;
  total_buy_value: number;
  total_sale_value: number;
  estimated_tax: number;
  slab_gain_taxable: number;
  slab_rate: number | null;
  fy_summaries: FyTaxSummary[];
  groups: {
    asset_type: string;
    tax_class: string;
    label: string;
    short_term_gain: number;
    long_term_gain: number;
    count: number;
    sale_value: number;
  }[];
  warnings: { fmv_missing: number; cost_estimated: number; indexation_used: number; slab_trades: number };
  records: CapitalGainRecord[];
};

export type InterestIncomeSummary = {
  financial_year: string;
  schedule_fy: string; // fy value for downloadInterestScheduleCSV
  total_taxable: number;
  total_tax_free: number;
  total_tds: number;
  total_received: number;
  total_not_yet_marked: number;
  total_upcoming: number;
  cumulative_fd_payouts_skipped: number;
  instruments: {
    source: string;
    holding_id: number;
    instrument_name: string;
    institution: string;
    owner: string;
    tax_status: string;
    interest: number;
    tds: number;
    payouts: number;
    received_payouts: number;
  }[];
};

export type SIPRecord = {
  id: number;
  user_id: number;
  profile_id?: number | null;
  profile_name?: string | null;
  profile_relation?: string | null;
  scheme_id?: number | null;
  scheme_name: string;
  folio_number?: string | null;
  amc?: string | null;
  isin?: string | null;
  amount: number;
  frequency: string;
  sip_day?: number | null;
  status: "ACTIVE" | "STOPPED" | "PAUSED" | "COMPLETED";
  start_date?: string | null;
  end_date?: string | null;
  last_sip_date?: string | null;
  next_sip_date?: string | null;
  completed_installments: number;
  total_installments?: number | null;
  total_invested: number;
  reminder_enabled: boolean;
  reminder_days_before: number;
  notify_push: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  is_auto_detected: boolean;
  notes?: string | null;
};

export type SIPSummary = {
  total_active_monthly_commitment: number;
  active_sips_count: number;
  stopped_sips_count: number;
  total_sips_count: number;
  total_invested_so_far: number;
  next_upcoming_sip?: {
    id: number;
    scheme_name: string;
    amount: number;
    next_sip_date: string;
    days_left: number;
  } | null;
};

type AIStreamStatus = {
  stage: string;
  title: string;
  subtitle: string;
};

type AIStreamHandlers = {
  onStatus?: (status: AIStreamStatus) => void;
  onToken?: (token: string) => void;
  onDone?: (payload: AIChatResponse) => void;
};

type AIStreamOptions = {
  signal?: AbortSignal;
};

function checkDemoRestriction() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("access_token");
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
  const userEmail = localStorage.getItem("user_email");
  const isDemoSession = sessionStorage.getItem("is_demo_session") === "true";

  if (
    token &&
    (isDemoSession || (userEmail && demoEmail && userEmail.toLowerCase() === demoEmail.toLowerCase()))
  ) {
    window.dispatchEvent(new CustomEvent("show-demo-restriction"));
    throw new Error("This action is disabled in demo mode.");
  }
}

/** FastAPI validation errors ([{loc, msg}, ...]) as plain words, e.g. "Annual rate should be 30 or less". */
function formatErrorDetail(detail: unknown): string {
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      const item = d as { loc?: unknown[]; msg?: string };
      const field = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1] ?? "") : "";
      const label = field ? field.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";
      const msg = (item.msg || "is not valid")
        .replace(/^Value error, /, "")
        .replace(/^Input should be less than or equal to (\S+)/, "should be $1 or less")
        .replace(/^Input should be greater than or equal to (\S+)/, "should be $1 or more")
        .replace(/^Input should be greater than (\S+)/, "should be more than $1")
        .replace(/^Input should be less than (\S+)/, "should be less than $1")
        .replace(/^Field required$/, "is required")
        .replace(/^Input should be /, "should be ");
      return label ? `${label} ${msg}` : msg;
    });
    return parts.join(". ") || "Please check the values you entered.";
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return "Please check the values you entered.";
}

// Offline cache entries are the only "email:cacheKey:profileId" keys. They pile up across accounts and are never
// removed on logout; once they fill Safari's storage, saving the login token fails (iPhone login loop).
export function clearOfflineCache() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.split(":").length === 3)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage blocked entirely (e.g. Safari "Block All Cookies"): nothing to clear
  }
}

export const STORAGE_BLOCKED_MESSAGE =
  "Your browser couldn't save your login. Check that cookies aren't blocked in Safari settings, or clear this site's data, then try again.";

// Clears the offline cache first so a full cache can't block the login; throws a readable error if storage still refuses.
export function saveAccessToken(token: string) {
  clearOfflineCache();
  try {
    localStorage.setItem("access_token", token);
  } catch {
    throw new Error(STORAGE_BLOCKED_MESSAGE);
  }
}

function handleUnauthorized(endpoint: string) {
  if (typeof window === "undefined") return;
  const isAuthEndpoint = endpoint.startsWith("/auth");
  if (isAuthEndpoint) return;

  const path = window.location.pathname;
  if (
    !path.startsWith("/auth") &&
    !path.startsWith("/login") &&
    !path.startsWith("/register") &&
    !path.startsWith("/demo") &&
    !path.startsWith("/google-callback")
  ) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("active_profile_id");
    window.location.href = "/auth?session_expired=true";
  }
}

export const api = {
  async fetch(
    endpoint: string,
    options: RequestInit & { cacheKey?: string } = {},
  ) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const activeProfileId = typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null;

    try {
      const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;

      // Intercept and block demo user actions for mutations (editing/creating/deleting)
      if (
        token &&
        typeof window !== "undefined" &&
        ["POST", "PUT", "DELETE", "PATCH"].includes(options.method || "GET")
      ) {
        // Safe / background endpoints that shouldn't trigger the restriction modal
        const isAllowedForDemo =
          endpoint.startsWith("/auth/") ||
          endpoint.startsWith("/updates/") ||
          endpoint.startsWith("/analytics/") ||
          endpoint.startsWith("/fcm/") ||
          endpoint.startsWith("/ai/");

        if (!isAllowedForDemo) {
          checkDemoRestriction();
        }
      }

      let finalEndpoint = endpoint;
      
      if (activeProfileId && !endpoint.includes("profile_id=")) {
        const scopedPrefixes = [
          "/equity/net-worth",
          "/equity/summary",
          "/equity/journey",
          "/equity/allocation",
          "/equity/transactions",
          "/equity/transaction",
          "/portfolio/summary",
          "/portfolio/schemes",
          "/portfolio/amc-allocation",
          "/portfolio/scheme-allocation",
          "/portfolio/transactions",
          "/portfolio/xirr",
          "/portfolio/benchmark-xirr",
          "/portfolio/xirr-timeseries",
          "/portfolio/stock-benchmark-xirr",
          "/portfolio/timeseries",
          "/portfolio/mf-journey",
          "/portfolio/insights",
          "/portfolio/export/transactions",
          "/goals",
          "/goals/",
          "/cas/upload",
          "/equity/import",
          "/equity/holding",
          "/reports/capital-gains",
          "/reports/interest-income",
          "/mf-gifts",
          "/portfolio/market-cap-allocation",
          "/insurance/policies",
          "/insurance",
          "/fixed-income/holdings",
          "/fixed-income",
          "/gold/holdings",
          "/gold",
          "/real-estate/holdings",
          "/real-estate",
          "/nps/accounts",
          "/nps",
          "/pms-aif/investments",
          "/pms-aif"
        ];
        
        const method = (options.method || "GET").toUpperCase();
        const pathPart = endpoint.split("?")[0];
        const isScopedPath = scopedPrefixes.some(prefix => pathPart === prefix || pathPart.startsWith(prefix + "/"));
        if (isScopedPath) {
          if (method === "GET") {
            const separator = endpoint.includes("?") ? "&" : "?";
            finalEndpoint = `${endpoint}${separator}profile_id=${activeProfileId}`;
          } else {
            // BUG-016: a write with no profile in its body would otherwise go to the default profile
            // on the backend. Pass the active profile unless the body already names one.
            let bodyNamesProfile = false;
            if (typeof options.body === "string") {
              try {
                bodyNamesProfile = "profile_id" in JSON.parse(options.body);
              } catch {
                bodyNamesProfile = false;
              }
            }
            // "all" (family view) is never valid for a write, so it is not sent on mutations.
            if (!bodyNamesProfile && String(activeProfileId) !== "all") {
              const separator = endpoint.includes("?") ? "&" : "?";
              finalEndpoint = `${endpoint}${separator}profile_id=${activeProfileId}`;
            }
          }
        }
      }

      // Default 25-second client timeout to prevent indefinite hangs
      const controller = new AbortController();
      let didTimeout = false;
      const timeoutTimer = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 25000);

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        } else {
          options.signal.addEventListener("abort", () => controller.abort(), { once: true });
        }
      }

      let res: Response;
      try {
        res = await fetch(`${API_URL}${finalEndpoint}`, {
          ...options,
          signal: controller.signal,
          cache: options.cache || "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          },
        });
      } catch (fetchErr: any) {
        if (didTimeout) {
          throw new Error("Request timed out. Please check your connection and try again.");
        }
        if (options.signal?.aborted) {
          throw new Error("Request canceled.");
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutTimer);
      }

      if (!res.ok) {
        if (res.status === 401) {
          handleUnauthorized(endpoint);
        }

        let errMsg = "Request failed";
        let reactivationToken = "";
        try {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object") {
              if (parsed.detail) {
                errMsg = typeof parsed.detail === "string" ? parsed.detail : formatErrorDetail(parsed.detail);
              } else if (parsed.message) {
                errMsg = parsed.message;
              }
              if (parsed.reactivation_token) {
                reactivationToken = parsed.reactivation_token;
              }
            }
          } catch {
            if (text) errMsg = text;
          }
        } catch {}
        const error = new Error(errMsg);
        (error as any).status = res.status;
        if (reactivationToken) {
          (error as any).reactivationToken = reactivationToken;
        }
        throw error;
      }

      const data = await res.json();

      // A live answer replaces any saved-data notice for this endpoint (BUG-021)
      if (servedFromCache.delete(endpoint)) publishCacheState();

      // Cache successful response if key provided
      if (options.cacheKey && typeof window !== "undefined") {
        const userEmail = localStorage.getItem("user_email") || "anonymous";
        const cacheProfileId = activeProfileId || "default";
        const namespacedKey = `${userEmail}:${options.cacheKey}:${cacheProfileId}`;
        try {
          localStorage.setItem(
            namespacedKey,
            JSON.stringify({ timestamp: Date.now(), data }),
          );
        } catch {
          // Storage full (Safari allows ~5 MB): drop the offline cache instead of failing a good response
          clearOfflineCache();
        }
      }

      return data;
    } catch (error: any) {
      console.warn(`API Error (${endpoint}):`, error);

      // Do NOT serve stale offline cache if request failed due to authentication (401)
      if (
        error?.status === 401 ||
        error?.message === "Invalid token" ||
        error?.message === "User not found" ||
        error?.message === "Account is deactivated"
      ) {
        throw error;
      }

      // BUG-021: saved data only when no response came back (offline, network error, timeout).
      // A server error (any HTTP status) is shown as an error, never replaced by old numbers.
      if (error?.status) {
        throw error;
      }

      // Offline Fallback: Try to return cached data, and say so on screen
      if (options.cacheKey && typeof window !== "undefined") {
        const userEmail = localStorage.getItem("user_email") || "anonymous";
        const cacheProfileId = activeProfileId || "default";
        const namespacedKey = `${userEmail}:${options.cacheKey}:${cacheProfileId}`;
        const cached = localStorage.getItem(namespacedKey);
        if (cached) {
          console.log(`[Offline] Serving cached data for ${namespacedKey}`);
          servedFromCache.add(endpoint);
          publishCacheState();
          return JSON.parse(cached).data;
        }
      }

      throw error;
    }
  },

  // Auth
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Login failed");
    }

    return res.json();
  },

  reactivate: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/reactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Reactivation failed");
    }

    return res.json();
  },

  reactivateGoogle: (reactivationToken: string) =>
    api.fetch("/auth/reactivate-google", {
      method: "POST",
      body: JSON.stringify({ reactivation_token: reactivationToken }),
    }),

  register: (email: string, password: string, signup_source: string = "other") =>
    api.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, signup_source }),
    }),

  /** Returns {exists: true} if the email is already registered, {exists: false} if it's new. */
  checkEmail: (email: string): Promise<{ exists: boolean }> =>
    api.fetch("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  googleLogin: (token: string, reactivate: boolean = false) =>
    api.fetch(`/auth/google?reactivate=${reactivate}`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  googleLoginWithCode: (code: string, redirectUri: string, reactivate: boolean = false) =>
    api.fetch(`/auth/google/code?reactivate=${reactivate}`, {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    }),

  resetPassword: (email: string) =>
    api.fetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  requestPasswordReset: (email: string) =>
    api.fetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  confirmPasswordReset: (email: string, token: string, new_password: string) =>
    api.fetch("/auth/reset-password/confirm", {
      method: "POST",
      body: JSON.stringify({ email, token, new_password }),
    }),

  // Net Worth
  // Net Worth & Equity
  getNetWorth: () => api.fetch("/equity/net-worth", { cacheKey: "net-worth" }),

  addStockTransaction: (
    data: {
      symbol: string;
      quantity: number;
      price: number;
      date: string;
      transaction_type: "BUY" | "SELL";
      charges?: number | null;  // BUG-111: whole trade, ₹
      stt?: number | null;
    },
    profileId?: string,
    options?: { signal?: AbortSignal }
  ) =>
    api.fetch(`/equity/transaction${profileId ? `?profile_id=${profileId}` : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
      signal: options?.signal,
    }),

  refreshStockPrices: () => api.fetch("/equity/refresh", { method: "POST" }),

  getEquitySummary: () =>
    api.fetch("/equity/summary", { cacheKey: "equity-summary" }),
  getEquityJourney: (range: string = "ALL") =>
    api.fetch(`/equity/journey?range=${range}`),
  getStockTransactions: (symbol?: string) =>
    api.fetch(
      symbol
        ? `/equity/transactions?symbol=${encodeURIComponent(symbol)}`
        : "/equity/transactions",
    ),
  updateStockTransaction: (
    id: number,
    data: {
      quantity: number;
      price: number;
      date: string;
      transaction_type: string;
      notes?: string;
      charges?: number | null;  // BUG-111
      stt?: number | null;
    },
  ) =>
    api.fetch(`/equity/transaction/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteStockTransaction: (id: number) =>
    api.fetch(`/equity/transaction/${id}`, { method: "DELETE" }),

  getEquityAllocation: (profileId?: string) => {
    const endpoint = profileId
      ? `/equity/allocation?profile_id=${profileId}`
      : "/equity/allocation";
    return api.fetch(endpoint);
  },

  // Portfolio
  getPortfolioSummary: () =>
    api.fetch("/portfolio/summary", { cacheKey: "portfolio-summary" }),
  getSchemes: (profileId?: string) => {
    const endpoint = profileId && profileId !== "all"
      ? `/portfolio/schemes?profile_id=${profileId}`
      : "/portfolio/schemes";
    return api.fetch(endpoint, { cacheKey: "schemes" });
  },
  getSchemeDetail: (id: number) =>
    api.fetch(`/portfolio/schemes/${id}`, { cacheKey: `scheme-${id}` }),
  updateScheme: (
    id: number,
    data: { units: number; invested_amount: number },
  ) =>
    api.fetch(`/portfolio/schemes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then((res) => {
      api.clearPortfolioCache();
      return res;
    }),
  deleteScheme: (id: number) =>
    api.fetch(`/portfolio/schemes/${id}`, { method: "DELETE" }).then((res) => {
      api.clearPortfolioCache();
      return res;
    }),
  getAMCAllocation: () =>
    api.fetch("/portfolio/amc-allocation", { cacheKey: "amc-allocation" }),
  getSchemeAllocation: () =>
    api.fetch("/portfolio/scheme-allocation", {
      cacheKey: "scheme-allocation",
    }),
  getTransactions: (skip = 0, limit = 50) =>
    api.fetch(`/portfolio/transactions?skip=${skip}&limit=${limit}`, {
      cacheKey: `transactions-${skip}-${limit}`,
    }),
  deleteMFTransaction: (id: number) =>
    api.fetch(`/portfolio/transaction/${id}`, { method: "DELETE" }),
  // MF gifting: link a gift-in to the donor's gift-out, or enter its original cost.
  getMFGifts: () => api.fetch(`/mf-gifts`),
  getGiftCandidates: (giftInTxId: number) =>
    api.fetch(`/mf-gifts/${giftInTxId}/candidates`),
  linkGift: (giftInTxId: number, giftOutTxId: number) =>
    api.fetch(`/mf-gifts/link`, {
      method: "POST",
      body: JSON.stringify({ gift_in_tx_id: giftInTxId, gift_out_tx_id: giftOutTxId }),
    }),
  setGiftCost: (
    giftInTxId: number,
    lots: { acquired_date: string; units: number; cost: number }[],
  ) =>
    api.fetch(`/mf-gifts/${giftInTxId}/cost`, {
      method: "PUT",
      body: JSON.stringify({ lots }),
    }),
  removeGiftLink: (transferId: number) =>
    api.fetch(`/mf-gifts/links/${transferId}`, { method: "DELETE" }),
  updateMFTransaction: (id: number, data: any) =>
    api.fetch(`/portfolio/transaction/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  exportTransactions: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    const res = await fetch(`${API_URL}/portfolio/export/transactions`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized("/portfolio/export/transactions");
      }
      throw new Error("Export failed");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // BUG-095 follow-up: interest income (other sources) for the Tax page, built from the interest schedule.
  getInterestIncome: (financialYear?: string): Promise<InterestIncomeSummary> => {
    const params = new URLSearchParams();
    if (financialYear) params.append("financial_year", financialYear);
    return api.fetch(`/reports/interest-income?${params.toString()}`);
  },

  getCapitalGainsSummary: (financialYear?: string, assetClass: string = "all", slabRate?: number | null): Promise<CapitalGainsSummary> => {
    const params = new URLSearchParams();
    if (financialYear) params.append("financial_year", financialYear);
    params.append("asset_class", assetClass);
    if (slabRate !== undefined && slabRate !== null) params.append("slab_rate", String(slabRate));
    return api.fetch(`/reports/capital-gains/summary?${params.toString()}`);
  },

  updateTradeDetails: (data: {
    asset_type: string;
    buy_tx_id?: number | null;
    sell_tx_id?: number | null;
    bought_date?: string | null;
    sold_date?: string | null;
    bought_rate?: number | null;
    sold_rate?: number | null;
    quantity?: number | null;
  }) =>
    api.fetch("/reports/trade/update", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  downloadCapitalGainsCSV: async (financialYear?: string, assetClass: string = "all", reportType: string = "it_portal_112a") => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    const activeProfileId =
      typeof window !== "undefined"
        ? localStorage.getItem("active_profile_id")
        : null;

    const params = new URLSearchParams();
    if (financialYear) params.append("financial_year", financialYear);
    params.append("asset_class", assetClass);
    params.append("report_type", reportType);
    if (activeProfileId) params.append("profile_id", activeProfileId);

    const res = await fetch(`${API_URL}/reports/capital-gains/csv?${params.toString()}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized("/reports/capital-gains/csv");
      }
      throw new Error("CSV Export failed");
    }

    const disposition = res.headers.get("Content-Disposition");
    let filename = `capital_gains_${reportType}.csv`;
    if (disposition && disposition.includes("filename=")) {
      filename = disposition.split("filename=")[1].replace(/"/g, "").trim();
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  resetPortfolio: (type: "ALL" | "MF" | "STOCKS" = "ALL", profileId?: string) => {
    const param = profileId ? `&profile_id=${profileId}` : "";
    return api.fetch(`/portfolio/reset?reset_type=${type}${param}`, { method: "DELETE" });
  },
  refreshNAVs: () => api.fetch("/portfolio/refresh-navs", { method: "POST" }),
  getXIRR: () => api.fetch("/portfolio/xirr", { cacheKey: "xirr" }),
  getMarketCapAllocation: () =>
    api.fetch("/portfolio/market-cap-allocation", { cacheKey: "market-cap-allocation" }),

  getMutualFundJourney: (range: string = "ALL") =>
    api.fetch(`/portfolio/mf-journey?range=${range}`),

  getBenchmark: () => api.fetch("/portfolio/benchmark"),
  // BUG-028: Nifty 50 XIRR on the same cash flows as the portfolio XIRR (profile-scoped)
  getBenchmarkXirr: () => api.fetch("/portfolio/benchmark-xirr", { cacheKey: "benchmark_xirr" }),
  // BUG-038: mutual fund XIRR at each month end (profile-scoped)
  getMfXirrTimeseries: () => api.fetch("/portfolio/xirr-timeseries", { cacheKey: "mf_xirr_timeseries" }),
  // BUG-042: stock XIRR vs Nifty 50 on the same cash flows (profile-scoped)
  getStockBenchmarkXirr: () => api.fetch("/portfolio/stock-benchmark-xirr", { cacheKey: "stock_benchmark_xirr" }),
  getBenchmarkGrowth: (range: string = "1Y", baseAmount: number = 10000, profileId?: string) => {
    const params = new URLSearchParams({
      range,
      base_amount: String(baseAmount),
    });
    // "all" must be sent too: with no profile_id the backend falls back to the default (Self) profile
    if (profileId) {
      params.append("profile_id", profileId);
    }
    return api.fetch(`/portfolio/benchmark-growth?${params.toString()}`);
  },

  // Schemesy: "portfolio-history" }),
  getInsights: () => api.fetch("/portfolio/insights", { cacheKey: "insights" }),

  addManualTransaction: async (data: Record<string, unknown>, profileId?: string) => {
    const endpoint = profileId && profileId !== "all"
      ? `/portfolio/transactions/manual?profile_id=${profileId}`
      : "/portfolio/transactions/manual";
    const res = await api.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },

  // Goals
  getGoals: (profileId?: string) => {
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const query = activeProf ? `?profile_id=${activeProf}` : "";
    return api.fetch(`/goals/${query}`, { cacheKey: "goals" });
  },
  createGoal: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/goals/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    api.clearCache(["goals"]);
    return res;
  },
  updateGoal: async (id: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    api.clearCache(["goals"]);
    return res;
  },
  deleteGoal: async (id: number) => {
    const res = await api.fetch(`/goals/${id}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    api.clearCache(["goals"]);
    return res;
  },

  // Gold & Commodities
  getGoldRates: () => api.fetch("/gold/rates"),
  getGoldHoldings: (profileId?: string) => {
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const query = activeProf ? `?profile_id=${activeProf}` : "";
    return api.fetch(`/gold/holdings${query}`, { cacheKey: "gold-holdings" });
  },
  addGoldHolding: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/gold/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  updateGoldHolding: async (id: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/gold/holdings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteGoldHolding: async (id: number) => {
    const res = await api.fetch(`/gold/holdings/${id}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },
  // One purchase (top-up) inside a digital gold holding; the holding's totals follow on the backend.
  updateGoldPurchase: async (holdingId: number, purchaseId: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/gold/holdings/${holdingId}/purchases/${purchaseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteGoldPurchase: async (holdingId: number, purchaseId: number) => {
    const res = await api.fetch(`/gold/holdings/${holdingId}/purchases/${purchaseId}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },

  // Fixed Income & Deposits
  getFixedIncomeHoldings: (profileId?: string) => {
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const query = activeProf ? `?profile_id=${activeProf}` : "";
    return api.fetch(`/fixed-income/holdings${query}`, { cacheKey: "fixed-income-holdings" });
  },
  addFixedIncomeHolding: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/fixed-income/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  updateFixedIncomeHolding: async (id: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/fixed-income/holdings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteFixedIncomeHolding: async (id: number) => {
    const res = await api.fetch(`/fixed-income/holdings/${id}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },
  getInterestSchedule: (params?: { profileId?: string; fy?: string; statusFilter?: string }) => {
    const activeProf = params?.profileId !== undefined ? params.profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const searchParams = new URLSearchParams();
    if (activeProf && activeProf !== "all") searchParams.append("profile_id", activeProf);
    if (params?.fy) searchParams.append("fy", params.fy);
    if (params?.statusFilter) searchParams.append("status_filter", params.statusFilter);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api.fetch(`/fixed-income/interest-schedule${qs}`);
  },
  updateInterestReceipt: async (payload: {
    holding_id: number;
    source?: string; // FIXED_INCOME (default), SGB, INCOME
    due_date: string;
    is_received: boolean;
    actual_amount?: number;
    tds_deducted?: number;
    date_received?: string;
    bank_account?: string;
    notes?: string;
  }) => {
    const res = await api.fetch("/fixed-income/interest-receipt", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    api.clearPortfolioCache();
    return res;
  },
  // BUG-095: pension / salary / annuity shown in the interest schedule
  getRegularIncome: () => api.fetch("/fixed-income/regular-income"),
  saveRegularIncome: async (payload: RegularIncomePayload, id?: number) => {
    const res = await api.fetch(id ? `/fixed-income/regular-income/${id}` : "/fixed-income/regular-income", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteRegularIncome: async (id: number) => {
    const res = await api.fetch(`/fixed-income/regular-income/${id}`, { method: "DELETE" });
    api.clearPortfolioCache();
    return res;
  },
  uploadFixedIncomeBulk: async (file: File, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const qs = activeProf && activeProf !== "all" ? `?profile_id=${activeProf}` : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${API_URL}/fixed-income/upload-bulk${qs}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Failed to bulk upload fixed income holdings");
    }
    api.clearPortfolioCache();
    return res.json();
  },
  getFixedIncomeTemplateUrl: () => `${API_URL}/fixed-income/template/csv`,
  // The export needs the Bearer token, so it is fetched and saved as a file (opening the URL in a tab got 401).
  downloadInterestScheduleCSV: async (fy?: string, profileId?: string | null) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const searchParams = new URLSearchParams();
    if (profileId && profileId !== "all") searchParams.append("profile_id", profileId);
    if (fy) searchParams.append("fy", fy);
    const res = await fetch(`${API_URL}/fixed-income/export/interest-schedule?${searchParams.toString()}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized("/fixed-income/export/interest-schedule");
      throw new Error("CSV export failed");
    }
    const disposition = res.headers.get("Content-Disposition");
    const filename = disposition?.includes("filename=")
      ? disposition.split("filename=")[1].replace(/"/g, "").trim()
      : "interest_schedule.csv";
    const url = window.URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Insurance & Policy Vault
  getInsurancePolicies: (profileId?: string) => {
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const query = activeProf ? `?profile_id=${activeProf}` : "";
    return api.fetch(`/insurance/policies${query}`, { cacheKey: "insurance-policies" });
  },
  addInsurancePolicy: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/insurance/policies", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  updateInsurancePolicy: async (id: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/insurance/policies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  // BUG-106: replace the funds a ULIP holds (units x NAV)
  setUlipFunds: async (
    policyId: number,
    funds: { fund_name: string; units: number; nav: number; nav_date?: string | null }[]
  ) => {
    const res = await api.fetch(`/insurance/policies/${policyId}/funds`, {
      method: "PUT",
      body: JSON.stringify({ funds }),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteInsurancePolicy: async (id: number) => {
    const res = await api.fetch(`/insurance/policies/${id}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },

  // BUG-092: NPS accounts (units x NAV per scheme, contributions)
  getNpsAccounts: () => api.fetch("/nps/accounts", { cacheKey: "nps-accounts" }),
  saveNpsAccount: async (data: Record<string, unknown>, id?: number) => {
    const res = await api.fetch(id ? `/nps/accounts/${id}` : "/nps/accounts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteNpsAccount: async (id: number) => {
    const res = await api.fetch(`/nps/accounts/${id}`, { method: "DELETE" });
    api.clearPortfolioCache();
    return res;
  },

  // BUG-117 / BUG-094: PMS & AIF (statement value + dated money in and out)
  getAltInvestments: () => api.fetch("/pms-aif/investments", { cacheKey: "pms-aif-investments" }),
  saveAltInvestment: async (data: Record<string, unknown>, id?: number) => {
    const res = await api.fetch(id ? `/pms-aif/investments/${id}` : "/pms-aif/investments", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteAltInvestment: async (id: number) => {
    const res = await api.fetch(`/pms-aif/investments/${id}`, { method: "DELETE" });
    api.clearPortfolioCache();
    return res;
  },

  // Real Estate & Property Vault
  getRealEstateHoldings: (profileId?: string) => {
    const activeProf = profileId !== undefined ? profileId : (typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null);
    const query = activeProf ? `?profile_id=${activeProf}` : "";
    return api.fetch(`/real-estate/holdings${query}`, { cacheKey: "real-estate-holdings" });
  },
  addRealEstateHolding: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/real-estate/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  updateRealEstateHolding: async (id: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/real-estate/holdings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteRealEstateHolding: async (id: number) => {
    const res = await api.fetch(`/real-estate/holdings/${id}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },
  // BUG-030: optional home loan per property
  saveRealEstateLoan: async (holdingId: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  deleteRealEstateLoan: async (holdingId: number) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },
  // Real estate feedback: amortization schedule, What-If sale simulator (GET, no side effects), Nifty comparison
  getRealEstateLoanSchedule: (holdingId: number) => {
    return api.fetch(`/real-estate/holdings/${holdingId}/loan/schedule`);
  },
  // Fix one EMI month: what was actually paid (0 = missed), or reset it to the schedule
  setLoanPayment: async (holdingId: number, dueDate: string, paidAmount: number, note?: string) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan/payments`, {
      method: "PUT",
      body: JSON.stringify({ due_date: dueDate, paid_amount: paidAmount, note: note || null }),
    });
    api.clearPortfolioCache();
    return res;
  },
  setLoanPaymentsBulk: async (
    holdingId: number,
    data: { from_date: string; to_date: string; paid_amount?: number | null; reset?: boolean }
  ) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan/payments/bulk`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  bulkPropertyTransactions: async (holdingId: number, data: { ids: number[]; action: "SET_AMOUNT" | "DELETE"; amount?: number }) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/bulk`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  // Floating-rate history: replaces the whole list (empty list clears it)
  saveLoanRateChanges: async (
    holdingId: number,
    changes: { effective_date: string; annual_rate: number; new_emi?: number | null }[]
  ) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan/rate-changes`, {
      method: "PUT",
      body: JSON.stringify({ changes }),
    });
    api.clearPortfolioCache();
    return res;
  },
  resetLoanPayment: async (holdingId: number, dueDate: string) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/loan/payments/${dueDate}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },
  simulatePropertySale: (holdingId: number, saleValue: number, saleDate: string, assumeRent: boolean) => {
    const q = new URLSearchParams({
      sale_value: String(Math.round(saleValue)),
      sale_date: saleDate,
      assume_rent: String(assumeRent),
    });
    return api.fetch(`/real-estate/holdings/${holdingId}/simulate?${q.toString()}`);
  },
  getPropertyBenchmark: (holdingId: number) => {
    return api.fetch(`/real-estate/holdings/${holdingId}/benchmark`);
  },
  // Every dated cash movement of one property, as used by its XIRR (EMIs split, valuation rows).
  getPropertyCashFlow: (holdingId: number) => {
    return api.fetch(`/real-estate/holdings/${holdingId}/cash-flow`);
  },
  getPropertyTransactions: (holdingId: number) => {
    return api.fetch(`/real-estate/holdings/${holdingId}/transactions`);
  },
  addPropertyTransaction: async (holdingId: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  generateRecurringPropertyTransactions: async (holdingId: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/recurring`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  updatePropertyTransaction: async (holdingId: number, transactionId: number, data: Record<string, unknown>) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/${transactionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },
  // Owner feedback #1: income/expenses from a CSV or Excel file. Preview saves nothing.
  previewPropertyImport: async (holdingId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("access_token");
    const r = await fetch(`${API_URL}/real-estate/holdings/${holdingId}/transactions/import-preview`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Could not read the file" }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Could not read the file");
    }
    return r.json();
  },
  importPropertyTransactions: async (
    holdingId: number,
    entries: { transaction_type: string; amount: number; transaction_date: string; description?: string | null; sub_category?: string | null }[]
  ) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/import`, {
      method: "POST",
      body: JSON.stringify({ entries }),
    });
    api.clearPortfolioCache();
    return res;
  },
  deletePropertyTransaction: async (holdingId: number, transactionId: number) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/${transactionId}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },

  // CAS Upload
  uploadCAS: async (
    file: File,
    password: string,
    profileId?: string,
    pan?: string,
    forceReimport?: boolean,
    restoreDeleted?: string[],
    // Wrong-statement safeguards: the backend checks first and may answer status
    // "needs_confirmation" with warnings (nothing saved); upload again without it to go ahead.
    riskCheck?: boolean,
  ) => {
    checkDemoRestriction();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
    if (pan && pan.trim()) {
      formData.append("pan", pan.trim().toUpperCase());
    }
    // BUG-031: re-import a statement already seen, to restore funds deleted in the app
    if (forceReimport) {
      formData.append("force_reimport", "true");
    }
    // Funds the user deleted earlier and ticked to add back on this upload
    if (restoreDeleted && restoreDeleted.length > 0) {
      formData.append("restore_deleted", JSON.stringify(restoreDeleted));
    }
    if (riskCheck) {
      formData.append("risk_check", "true");
    }
    const token = localStorage.getItem("access_token");
    const url = profileId 
      ? `${API_URL}/cas/upload?profile_id=${profileId}` 
      : `${API_URL}/cas/upload`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Upload failed" }));
      const error: any = new Error(err.detail || "Upload failed");
      error.status = r.status;
      error.detail = err.detail;
      throw error;
    }
    api.clearPortfolioCache();
    return r.json();
  },
  searchStocks: (query: string) => api.fetch(`/equity/search?q=${query}`, {}),

  // BUG-099: move a holding with no live price to the NSE/BSE stock the user picks. confirm=false previews.
  fixHoldingSymbol: async (holdingId: number, symbol: string, confirm: boolean) => {
    const res = await api.fetch(`/equity/holding/${holdingId}/fix-symbol`, {
      method: "POST",
      body: JSON.stringify({ symbol, confirm }),
    });
    if (confirm) api.clearPortfolioCache();
    return res as { symbol: string; price: number; quantity: number; value: number; merges_with_existing: boolean };
  },

  searchMutualFunds: (query: string) =>
    api.fetch(`/portfolio/search?q=${query}`),

  getStockQuote: (symbol: string) =>
    api.fetch(`/equity/quote?symbol=${symbol}`, {}),

  getStockFundamentals: (symbol: string) =>
    api.fetch(`/equity/fundamentals/${symbol}`),

  deleteHolding: (id: number) =>
    api.fetch(`/equity/holding/${id}`, { method: "DELETE" }),

  updateHolding: (id: number, data: { quantity: number; avg_price: number; date?: string | null }) =>
    api.fetch(`/equity/holding/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  previewTradebook: async (file: File, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("access_token");
    const url = profileId
      ? `${API_URL}/equity/import-preview?profile_id=${profileId}`
      : `${API_URL}/equity/import-preview`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Preview failed" }));
      const detail = err.detail || err.message || "Failed to parse tradebook";
      const errorMsg = typeof detail === "string" ? detail : (detail.message || "Failed to parse tradebook");
      const errorObj = new Error(errorMsg);
      (errorObj as any).data = typeof detail === "object" ? detail : null;
      throw errorObj;
    }
    return r.json();
  },

  commitTradebook: async (
    trades: any[],
    broker: string = "BROKER_IMPORT",
    profileId?: string,
    // BUG-057: splits/bonus issues confirmed in the preview (share multiplier per ex-date)
    corporateActions?: { symbol: string; date: string; ratio: number }[],
    // BUG-078 follow-up: saved trades to re-date from this file (day and month were swapped)
    dateFixes?: { transaction_id: number; date: string }[],
  ) => {
    const token = localStorage.getItem("access_token");
    const url = profileId
      ? `${API_URL}/equity/import-commit?profile_id=${profileId}`
      : `${API_URL}/equity/import-commit`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        trades,
        broker,
        ...(corporateActions ? { corporate_actions: corporateActions } : {}),
        ...(dateFixes && dateFixes.length ? { date_fixes: dateFixes } : {}),
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Commit failed" }));
      const detail = err.detail || err.message || "Failed to commit trades";
      const errorMsg = typeof detail === "string" ? detail : (detail.message || "Failed to commit trades");
      const errorObj = new Error(errorMsg);
      (errorObj as any).data = typeof detail === "object" ? detail : null;
      throw errorObj;
    }
    api.clearPortfolioCache();
    return r.json();
  },

  recordCorporateAction: async (
    data: {
      symbol: string;
      action_type: string;
      quantity: number;
      price?: number;
      date: string;
      ratio?: string;
      notes?: string;
    },
    profileId?: string
  ) => {
    const url = profileId
      ? `/equity/corporate-action?profile_id=${profileId}`
      : `/equity/corporate-action`;
    const res = await api.fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },

  // BUG-091: parent keeps its shares; new shares get cost_percent of the parent's cost and its dates.
  recordDemerger: async (
    data: { symbol: string; new_symbol: string; new_quantity: number; cost_percent: number; date: string; notes?: string },
    profileId?: string
  ) => {
    const url = profileId
      ? `/equity/corporate-action/demerger?profile_id=${profileId}`
      : `/equity/corporate-action/demerger`;
    const res = await api.fetch(url, { method: "POST", body: JSON.stringify(data) });
    api.clearPortfolioCache();
    return res;
  },

  getCorporateActions: async (symbol?: string, profileId?: string) => {
    let url = "/equity/corporate-actions";
    const params = new URLSearchParams();
    if (symbol) params.append("symbol", symbol);
    if (profileId) params.append("profile_id", profileId);
    if (params.toString()) url += `?${params.toString()}`;
    return api.fetch(url);
  },

  reconcileDematStatement: async (file: File, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = profileId
      ? `${API_URL}/equity/reconcile-demat?profile_id=${profileId}`
      : `${API_URL}/equity/reconcile-demat`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Reconciliation failed" }));
      throw new Error(err.detail || err.message || "Failed to reconcile statement");
    }
    return r.json();
  },

  syncDematReconcile: async (items: any[], notes?: string, profileId?: string) => {
    const url = profileId
      ? `/equity/reconcile-sync?profile_id=${profileId}`
      : `/equity/reconcile-sync`;
    const res = await api.fetch(url, {
      method: "POST",
      body: JSON.stringify({ items, notes }),
    });
    api.clearPortfolioCache();
    return res;
  },

  importHoldingsStatement: async (file: File, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = profileId
      ? `${API_URL}/equity/import-holdings?profile_id=${profileId}`
      : `${API_URL}/equity/import-holdings`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(err.detail || err.message || "Failed to import holdings statement");
    }
    api.clearPortfolioCache();
    return r.json();
  },

  importTrades: async (file: File, broker: string, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("broker", broker);
    const token = localStorage.getItem("access_token");
    const url = profileId 
      ? `${API_URL}/equity/import?profile_id=${profileId}` 
      : `${API_URL}/equity/import`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Import failed" }));
      const detail = err.detail || err.message || "Import failed";
      const errorMsg = typeof detail === "string" ? detail : (detail.message || "Import failed");
      const errorObj = new Error(errorMsg);
      (errorObj as any).data = typeof detail === "object" ? detail : null;
      throw errorObj;
    }
    api.clearPortfolioCache();
    return r.json();
  },

  importMFTransactionsCSV: async (file: File, profileId?: string) => {
    checkDemoRestriction();
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("access_token");
    const url = profileId 
      ? `${API_URL}/portfolio/transactions/import-csv?profile_id=${profileId}` 
      : `${API_URL}/portfolio/transactions/import-csv`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(err.detail || "Import failed");
    }
    api.clearPortfolioCache();
    return r.json();
  },

  // User Profile
  getUserProfile: () => api.fetch("/users/me", { cacheKey: "user-profile" }),

  deleteUserProfile: () =>
    api.fetch("/users/me", {
      method: "DELETE",
    }),

  updateUserProfile: (data: {
    full_name?: string;
    phone_number?: string;
    pan_card?: string;
    signup_source?: string;
  }) =>
    api.fetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateAssetPreferences: async (prefs: Record<string, any>, profileId?: string | number) => {
    const query = profileId ? `?profile_id=${profileId}` : "";
    const payload = profileId ? { ...prefs, profile_id: profileId } : prefs;
    const res = await api.fetch(`/users/me/asset-preferences${query}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    api.clearPortfolioCache();
    api.clearCache(["user-profile", "family-summary", "net-worth", "portfolio-summary", "profile"]);
    return res;
  },

  uploadAvatar: async (file: File) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/users/me/avatar`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized("/users/me/avatar");
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to upload avatar");
    }

    api.clearCache(["user-profile"]);
    return res.json();
  },

  deleteAvatar: async () => {
    const res = await api.fetch("/users/me/avatar", { method: "DELETE" });
    api.clearCache(["user-profile"]);
    return res;
  },

  applyReferralCode: (code: string) =>
    api.fetch(`/users/referral/apply?code=${code}`, {
      method: "POST",
    }),

  // AI
  getSessions: () => api.fetch("/ai/sessions"),
  createSession: () => api.fetch("/ai/sessions", { method: "POST" }),
  getSessionMessages: (sessionId: number) =>
    api.fetch(`/ai/sessions/${sessionId}/messages`),
  getAIQuotaStatus: (): Promise<AIQuotaStatus> => api.fetch("/ai/quota-status"),

  // Profiles CRUD
  getProfiles: () => api.fetch("/profiles/"),
  createProfile: (data: { name: string; profile_type: string; relation: string; pan?: string }) =>
    api.fetch("/profiles/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProfile: (
    id: number,
    data: { name?: string; profile_type?: string; relation?: string; pan?: string }
  ) =>
    api.fetch(`/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  archiveProfile: (id: number) =>
    api.fetch(`/profiles/${id}/archive`, {
      method: "POST",
    }),
  setDefaultProfile: (id: number) =>
    api.fetch(`/profiles/${id}/default`, {
      method: "POST",
    }),
  getFamilySummary: () =>
    api.fetch("/profiles/family/summary", { cacheKey: "family-summary" }),

  getFamilyTopHoldings: (limit = 10) =>
    api.fetch(`/profiles/family/top-holdings?limit=${limit}`, { cacheKey: "family-top-holdings" }),

  // Utilities
  clearCache: (keys: string[]) => {
    if (typeof window !== "undefined") {
      const userEmail = localStorage.getItem("user_email") || "anonymous";
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const lsKey = localStorage.key(i);
        if (lsKey) {
          const parts = lsKey.split(":");
          // Key format is: userEmail:cacheKey:profileId or userEmail:cacheKey
          if (parts[0] === userEmail && keys.some(k => parts[1] === k || parts[1].startsWith(k + "-"))) {
            keysToRemove.push(lsKey);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  },

  clearPortfolioCache: () => {
    api.clearCache([
      "net-worth",
      "portfolio-summary",
      "equity-summary",
      "schemes",
      "amc-allocation",
      "scheme-allocation",
      "xirr",
      "insights",
      "portfolio-history",
      "goals",
      "user-profile",
      "family-summary",
      "family-top-holdings",
      "transactions",
      "market-cap-allocation",
      "gold-holdings",
      "fixed-income-holdings",
      "insurance-policies",
      "real-estate-holdings",
      "nps-accounts",
      "pms-aif-investments",
    ]);
  },

  chatWithAI: (message: string, sessionId?: number, activeProfileId?: string) =>
    api.fetch("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId, active_profile_id: activeProfileId }),
    }),
  submitAIFeedback: (data: {
    session_id?: number;
    message_content?: string;
    user_query?: string;
    feedback_type: "thumbs_up" | "thumbs_down";
    reason?: string;
    comment?: string;
  }) =>
    api.fetch("/ai/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  chatWithAIStream: async (
    message: string,
    sessionId: number | undefined,
    handlers: AIStreamHandlers = {},
    options: AIStreamOptions = {},
    activeProfileId?: string
  ): Promise<AIChatResponse> => {
    checkDemoRestriction();
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const res = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      signal: options.signal,
      body: JSON.stringify({
        message,
        session_id: sessionId,
        stream: true,
        active_profile_id: activeProfileId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Request failed");
    }

    if (!res.body) {
      throw new Error("Streaming not supported by browser");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let donePayload: AIChatResponse | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) break;

        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of rawEvent.split(/\r?\n/)) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length === 0) continue;

        const dataText = dataLines.join("\n");
        let payload: unknown;
        try {
          payload = JSON.parse(dataText);
        } catch {
          payload = { text: dataText };
        }

        if (eventName === "status") {
          handlers.onStatus?.(payload as AIStreamStatus);
        } else if (eventName === "token") {
          const tokenText = (payload as { text?: string }).text || "";
          handlers.onToken?.(tokenText);
        } else if (eventName === "done") {
          donePayload = payload as AIChatResponse;
          handlers.onDone?.(donePayload);
        } else if (eventName === "error") {
          const errDetail =
            (payload as { detail?: string }).detail ||
            "AI Service temporarily unavailable";
          throw new Error(errDetail);
        }
      }
    }

    if (!donePayload) {
      throw new Error("Streaming response ended unexpectedly");
    }

    return donePayload;
  },

  updateFcmToken: (token: string) =>
    api.fetch("/users/me/fcm-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  submitFeedback: async (data: {
    main_category?: string;
    type: string;
    title: string;
    body?: string;
    file?: File | null;
  }) => {
    checkDemoRestriction();
    if (data.file) {
      const formData = new FormData();
      formData.append("main_category", data.main_category || "suggestion");
      formData.append("type", data.type);
      formData.append("title", data.title);
      if (data.body) formData.append("body", data.body);
      formData.append("file", data.file);

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch(`${API_URL}/feedback/submit`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to submit" }));
        throw new Error(err.detail || err.message || "Failed to submit");
      }
      return res.json();
    }

    return api.fetch("/feedback/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUserFeedback: () =>
    api.fetch("/feedback/list"),

  getPublicSuggestions: (category?: string, limit: number = 8, offset: number = 0) => {
    let url = `/feedback/public/list?limit=${limit}&offset=${offset}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return api.fetch(url);
  },

  toggleFeedbackAgree: (feedbackId: number) =>
    api.fetch(`/feedback/${feedbackId}/agree`, {
      method: "POST",
    }),

  submitFeedbackComment: (feedbackId: number, comment: string) =>
    api.fetch(`/feedback/${feedbackId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),



  trackSupportClick: (paymentApp: string) =>
    api.fetch("/support/click", {
      method: "POST",
      body: JSON.stringify({ payment_app: paymentApp }),
    }),

  // What's New Updates
  getUpdates: () => api.fetch("/updates"),
  getUnreadUpdatesStatus: () => api.fetch("/updates/unread"),
  getLatestAnnouncement: () => api.fetch("/updates/latest-announcement"),
  markUpdatesAsSeen: () => api.fetch("/updates/seen", { method: "POST" }),
  markUpdateAsSeen: (id: number) => api.fetch(`/updates/${id}/seen`, { method: "POST" }),

  // Email & Notification Preferences
  getNotificationPreferences: () => api.fetch("/notifications/preferences"),
  updateNotificationPreferences: (data: any) =>
    api.fetch("/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getPublicNotificationPreferences: (token: string) =>
    api.fetch(`/notifications/preferences/public?token=${encodeURIComponent(token)}`),
  updatePublicNotificationPreferences: (data: any) =>
    api.fetch("/notifications/preferences/public", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  oneClickUnsubscribe: (token: string, reason?: string) => {
    let url = `/notifications/unsubscribe/one-click?token=${encodeURIComponent(token)}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    return api.fetch(url, { method: "POST" });
  },

  // SIPs Management
  getSIPs: (profileId?: number | string | null, status?: string) => {
    let url = "/sips";
    const params = new URLSearchParams();
    if (profileId && profileId !== "all") params.append("profile_id", profileId.toString());
    if (status) params.append("status", status);
    const queryString = params.toString();
    return api.fetch(queryString ? `${url}?${queryString}` : url);
  },
  getSIPSummary: (profileId?: number | string | null) => {
    let url = "/sips/summary";
    if (profileId && profileId !== "all") url += `?profile_id=${profileId}`;
    return api.fetch(url);
  },
  createSIP: (data: any) =>
    api.fetch("/sips", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSIP: (id: number, data: any) =>
    api.fetch(`/sips/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  toggleSIPStatus: (id: number) =>
    api.fetch(`/sips/${id}/toggle-status`, {
      method: "POST",
    }),
  deleteSIP: (id: number) =>
    api.fetch(`/sips/${id}`, {
      method: "DELETE",
    }),
  syncSIPs: (profileId?: number | string | null) => {
    let url = "/sips/sync";
    if (profileId && profileId !== "all") url += `?profile_id=${profileId}`;
    return api.fetch(url, { method: "POST" });
  },
};
