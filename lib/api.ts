const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AIChatResponse = {
  response: string;
  session_id: number;
  session_title: string;
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

      // Intercept and block demo user actions
      if (
        token &&
        typeof window !== "undefined" &&
        ["POST", "PUT", "DELETE", "PATCH"].includes(options.method || "GET")
      ) {
        const userEmail = localStorage.getItem("user_email");
        // Allowed endpoints for demo user
        const allowedEndpoints = ["/auth/login", "/auth/logout"];

        if (
          userEmail &&
          demoEmail &&
          userEmail.toLowerCase() === demoEmail.toLowerCase() &&
          !allowedEndpoints.some((ep) => endpoint.startsWith(ep))
        ) {
          alert("This feature is disabled for the demo account.");
          return;
        }
      }

      let finalEndpoint = endpoint;
      
      if (activeProfileId && !endpoint.includes("profile_id=")) {
        const scopedPrefixes = [
          "/equity/net-worth",
          "/equity/summary",
          "/equity/journey",
          "/equity/transactions",
          "/equity/transaction",
          "/portfolio/summary",
          "/portfolio/schemes",
          "/portfolio/amc-allocation",
          "/portfolio/scheme-allocation",
          "/portfolio/transactions",
          "/portfolio/xirr",
          "/portfolio/timeseries",
          "/portfolio/mf-journey",
          "/goals/",
          "/cas/upload",
          "/cas/upload-json",
          "/equity/import",
          "/equity/holding"
        ];
        
        const pathPart = endpoint.split("?")[0];
        if (scopedPrefixes.some(prefix => pathPart === prefix || pathPart.startsWith(prefix + "/"))) {
          const separator = endpoint.includes("?") ? "&" : "?";
          finalEndpoint = `${endpoint}${separator}profile_id=${activeProfileId}`;
        }
      }

      const res = await fetch(`${API_URL}${finalEndpoint}`, {
        ...options,
        cache: options.cache || "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = await res.json();

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
    } catch (error) {
      console.warn(`API Error (${endpoint}):`, error);

      // Offline Fallback: Try to return cached data
      if (options.cacheKey && typeof window !== "undefined") {
        const userEmail = localStorage.getItem("user_email") || "anonymous";
        const cacheProfileId = activeProfileId || "default";
        const namespacedKey = `${userEmail}:${options.cacheKey}:${cacheProfileId}`;
        const cached = localStorage.getItem(namespacedKey);
        if (cached) {
          console.log(`[Offline] Serving cached data for ${namespacedKey}`);
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

  register: (email: string, password: string, signup_source: string = "other") =>
    api.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, signup_source }),
    }),

  googleLogin: (token: string) =>
    api.fetch("/auth/google", {
      method: "POST",
      body: JSON.stringify({ token }),
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
    profileId?: string
  ) =>
    api.fetch(`/equity/transaction${profileId ? `?profile_id=${profileId}` : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
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
      transaction_type: "BUY" | "SELL";
    },
  ) =>
    api.fetch(`/equity/transaction/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteStockTransaction: (id: number) =>
    api.fetch(`/equity/transaction/${id}`, { method: "DELETE" }),

  getEquityAllocation: () => api.fetch("/equity/allocation"),

  // Portfolio
  getPortfolioSummary: () =>
    api.fetch("/portfolio/summary", { cacheKey: "portfolio-summary" }),
  getSchemes: () => api.fetch("/portfolio/schemes", { cacheKey: "schemes" }),
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

    if (!res.ok) throw new Error("Export failed");

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

  resetPortfolio: (type: "ALL" | "MF" | "STOCKS" = "ALL", profileId?: string) => {
    const param = profileId ? `&profile_id=${profileId}` : "";
    return api.fetch(`/portfolio/reset?reset_type=${type}${param}`, { method: "DELETE" });
  },
  refreshNAVs: () => api.fetch("/portfolio/refresh-navs", { method: "POST" }),
  getXIRR: () => api.fetch("/portfolio/xirr", { cacheKey: "xirr" }),

  getPortfolioHistory: () => api.fetch("/portfolio/timeseries", { cacheKey: "portfolio-history" }),
  getMutualFundJourney: (range: string = "ALL") =>
    api.fetch(`/portfolio/mf-journey?range=${range}`),

  getBenchmark: () => api.fetch("/portfolio/benchmark"),

  // Schemesy: "portfolio-history" }),
  getInsights: () => api.fetch("/portfolio/insights", { cacheKey: "insights" }),

  addManualTransaction: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/portfolio/transactions/manual", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearPortfolioCache();
    return res;
  },

  // Goals
  // Goals
  getGoals: () => api.fetch("/goals/", { cacheKey: "goals" }),
  createGoal: (data: Record<string, unknown>) =>
    api.fetch("/goals/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateGoal: (id: number, data: Record<string, unknown>) =>
    api.fetch(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteGoal: (id: number) =>
    api.fetch(`/goals/${id}`, {
      method: "DELETE",
    }),

  // CAS Upload
  uploadCAS: async (file: File, password: string, profileId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
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
      throw new Error(err.detail || "Upload failed");
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

  updateHolding: (id: number, data: { quantity: number; avg_price: number }) =>
    api.fetch(`/equity/holding/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

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
      throw new Error(err.detail || "Import failed");
    }
    api.clearPortfolioCache();
    return r.json();
  },

  // User Profile
  getUserProfile: () => api.fetch("/users/me", { cacheKey: "user-profile" }),

  updateUserProfile: (data: {
    full_name?: string;
    phone_number?: string;
    pan_card?: string;
  }) =>
    api.fetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  applyReferralCode: (code: string) =>
    api.fetch(`/users/referral/apply?code=${code}`, {
      method: "POST",
    }),

  // AI
  // AI
  getSessions: () => api.fetch("/ai/sessions"),
  createSession: () => api.fetch("/ai/sessions", { method: "POST" }),
  getSessionMessages: (sessionId: number) =>
    api.fetch(`/ai/sessions/${sessionId}/messages`),

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
      "transactions",
    ]);
  },

  chatWithAI: (message: string, sessionId?: number) =>
    api.fetch("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
  chatWithAIStream: async (
    message: string,
    sessionId: number | undefined,
    handlers: AIStreamHandlers = {},
    options: AIStreamOptions = {},
  ): Promise<AIChatResponse> => {
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

  submitFeedback: (data: { type: string; title: string; body?: string }) =>
    api.fetch("/feedback/submit", {
      method: "POST",
      body: JSON.stringify(data),
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
};
