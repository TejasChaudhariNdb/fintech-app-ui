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
          "/cas/upload-json",
          "/equity/import",
          "/equity/holding",
          "/reports/capital-gains",
          "/portfolio/market-cap-allocation",
          "/insurance/policies",
          "/insurance",
          "/fixed-income/holdings",
          "/fixed-income",
          "/gold/holdings",
          "/gold",
          "/real-estate/holdings",
          "/real-estate"
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
                errMsg = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
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
        localStorage.setItem(
          namespacedKey,
          JSON.stringify({ timestamp: Date.now(), data }),
        );
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

  getCapitalGainsSummary: (financialYear?: string, assetClass: string = "all") => {
    const params = new URLSearchParams();
    if (financialYear) params.append("financial_year", financialYear);
    params.append("asset_class", assetClass);
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
    if (profileId && profileId !== "all") {
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
  getInterestScheduleExportUrl: (fy?: string, profileId?: string) => {
    const searchParams = new URLSearchParams();
    if (profileId && profileId !== "all") searchParams.append("profile_id", profileId);
    if (fy) searchParams.append("fy", fy);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return `${API_URL}/fixed-income/export/interest-schedule${qs}`;
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
  deleteInsurancePolicy: async (id: number) => {
    const res = await api.fetch(`/insurance/policies/${id}`, {
      method: "DELETE",
    });
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
  deletePropertyTransaction: async (holdingId: number, transactionId: number) => {
    const res = await api.fetch(`/real-estate/holdings/${holdingId}/transactions/${transactionId}`, {
      method: "DELETE",
    });
    api.clearPortfolioCache();
    return res;
  },

  // CAS Upload
  uploadCAS: async (file: File, password: string, profileId?: string, pan?: string, forceReimport?: boolean) => {
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
      "prediction-stats",
      "family-summary",
      "family-top-holdings",
      "transactions",
      "market-cap-allocation",
      "gold-holdings",
      "fixed-income-holdings",
      "insurance-policies",
      "real-estate-holdings",
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

  // Predictions
  getPredictionStats: () => api.fetch("/predictions/today", { cacheKey: "prediction-stats" }),
  makePrediction: (prediction: 'BULL' | 'BEAR') =>
    api.fetch("/predictions/", {
      method: "POST",
      body: JSON.stringify({ prediction }),
    }).then((res) => {
      api.clearCache(["prediction-stats"]);
      return res;
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
