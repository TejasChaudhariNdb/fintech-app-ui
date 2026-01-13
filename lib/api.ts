const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  async fetch(
    endpoint: string,
    options: RequestInit & { cacheKey?: string } = {}
  ) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    try {
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
          JSON.stringify({ timestamp: Date.now(), data })
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

  register: (email: string, password: string) =>
    api.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

  // Portfolio
  getPortfolioSummary: () =>
    api.fetch("/portfolio/summary", { cacheKey: "portfolio-summary" }),
  getSchemes: () => api.fetch("/portfolio/schemes", { cacheKey: "schemes" }),
  getSchemeDetail: (id: number) =>
    api.fetch(`/portfolio/schemes/${id}`, { cacheKey: `scheme-${id}` }),
  getAMCAllocation: () =>
    api.fetch("/portfolio/amc-allocation", { cacheKey: "amc-allocation" }),
  getTransactions: (skip = 0, limit = 50) =>
    api.fetch(`/portfolio/transactions?skip=${skip}&limit=${limit}`, {
      cacheKey: `transactions-${skip}-${limit}`,
    }),
  resetPortfolio: () => api.fetch("/portfolio/reset", { method: "DELETE" }),
  refreshNAVs: () => api.fetch("/portfolio/refresh-navs", { method: "POST" }),
  getXIRR: () => api.fetch("/portfolio/xirr", { cacheKey: "xirr" }),
  getPortfolioHistory: () =>
    api.fetch("/portfolio/timeseries", { cacheKey: "portfolio-history" }),

  addManualTransaction: (data: any) =>
    api.fetch("/portfolio/transactions/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Goals
  // Goals
  getGoals: () => api.fetch("/goals/", { cacheKey: "goals" }),
  createGoal: (data: any) =>
    api.fetch("/goals/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateGoal: (id: number, data: any) =>
    api.fetch(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteGoal: (id: number) =>
    api.fetch(`/goals/${id}`, {
      method: "DELETE",
    }),

  // CAS Upload
  uploadCAS: (file: File, password: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
    const token = localStorage.getItem("access_token");
    return fetch(`${API_URL}/cas/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    });
  },
  searchStocks: (query: string) => api.fetch(`/equity/search?q=${query}`, {}),

  getStockQuote: (symbol: string) =>
    api.fetch(`/equity/quote?symbol=${symbol}`, {}),

  deleteHolding: (id: number) =>
    api.fetch(`/equity/holding/${id}`, { method: "DELETE" }),

  updateHolding: (id: number, data: { quantity: number; avg_price: number }) =>
    api.fetch(`/equity/holding/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
