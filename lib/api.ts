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

export const api = {
  async fetch(
    endpoint: string,
    options: RequestInit & { cacheKey?: string } = {},
  ) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

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

      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
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
        localStorage.setItem(
          options.cacheKey,
          JSON.stringify({ timestamp: Date.now(), data }),
        );
      }

      return data;
    } catch (error) {
      console.warn(`API Error (${endpoint}):`, error);

      // Offline Fallback: Try to return cached data
      if (options.cacheKey && typeof window !== "undefined") {
        const cached = localStorage.getItem(options.cacheKey);
        if (cached) {
          console.log(`[Offline] Serving cached data for ${options.cacheKey}`);
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

  addStockTransaction: (data: {
    symbol: string;
    quantity: number;
    price: number;
    date: string;
    transaction_type: "BUY" | "SELL";
  }) =>
    api.fetch("/equity/transaction", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refreshStockPrices: () => api.fetch("/equity/refresh", { method: "POST" }),

  getEquitySummary: () =>
    api.fetch("/equity/summary", { cacheKey: "equity-summary" }),

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
      api.clearCache([
        "portfolio-summary",
        "schemes",
        "amc-allocation",
        "scheme-allocation",
        "xirr",
        "insights",
      ]);
      return res;
    }),
  deleteScheme: (id: number) =>
    api.fetch(`/portfolio/schemes/${id}`, { method: "DELETE" }).then((res) => {
      api.clearCache([
        "portfolio-summary",
        "schemes",
        "amc-allocation",
        "scheme-allocation",
        "xirr",
        "insights",
      ]);
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

  resetPortfolio: (type: "ALL" | "MF" | "STOCKS" = "ALL") =>
    api.fetch(`/portfolio/reset?reset_type=${type}`, { method: "DELETE" }),
  refreshNAVs: () => api.fetch("/portfolio/refresh-navs", { method: "POST" }),
  getXIRR: () => api.fetch("/portfolio/xirr", { cacheKey: "xirr" }),

  getPortfolioHistory: () => api.fetch("/portfolio/timeseries"),

  getBenchmark: () => api.fetch("/portfolio/benchmark"),

  // Schemesy: "portfolio-history" }),
  getInsights: () => api.fetch("/portfolio/insights", { cacheKey: "insights" }),

  addManualTransaction: async (data: Record<string, unknown>) => {
    const res = await api.fetch("/portfolio/transactions/manual", {
      method: "POST",
      body: JSON.stringify(data),
    });
    api.clearCache([
      "portfolio-summary",
      "schemes",
      "amc-allocation",
      "scheme-allocation",
      "xirr",
      "insights",
    ]);
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
  uploadCAS: async (file: File, password: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
    const token = localStorage.getItem("access_token");
    const r = await fetch(`${API_URL}/cas/upload`, {
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
    api.clearCache([
      "portfolio-summary",
      "schemes",
      "amc-allocation",
      "scheme-allocation",
      "xirr",
      "insights",
    ]);
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

  importTrades: async (file: File, broker: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("broker", broker);
    const token = localStorage.getItem("access_token");
    const r = await fetch(`${API_URL}/equity/import`, {
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

  // Utilities
  clearCache: (keys: string[]) => {
    if (typeof window !== "undefined") {
      keys.forEach((key) => localStorage.removeItem(key));
    }
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
};
