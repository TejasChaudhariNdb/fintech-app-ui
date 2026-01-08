const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
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
    return res.json();
  },

  // Auth
  login: (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    return fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    }).then((r) => r.json());
  },

  register: (email: string, password: string) =>
    api.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Net Worth
  getNetWorth: () => api.fetch("/equity/net-worth"),
  addEquity: (symbol: string, quantity: number, avgPrice: number) =>
    api.fetch(
      `/equity/?symbol=${symbol}&quantity=${quantity}&avg_price=${avgPrice}`,
      {
        method: "POST",
      }
    ),
  getEquitySummary: () => api.fetch("/equity/summary"),

  // Portfolio
  getPortfolioSummary: () => api.fetch("/portfolio/summary"),
  getSchemes: () => api.fetch("/portfolio/schemes"),
  getSchemeDetail: (id: number) => api.fetch(`/portfolio/schemes/${id}`),
  getAMCAllocation: () => api.fetch("/portfolio/amc-allocation"),
  getTransactions: (skip = 0, limit = 50) =>
    api.fetch(`/portfolio/transactions?skip=${skip}&limit=${limit}`),
  resetPortfolio: () => api.fetch("/portfolio/reset", { method: "DELETE" }),
  refreshNAVs: () => api.fetch("/portfolio/refresh-navs", { method: "POST" }),
  getXIRR: () => api.fetch("/portfolio/xirr"),

  // Goals
  getGoals: () => api.fetch("/goals/"),
  createGoal: (name: string, target: number, year: number) =>
    api.fetch(`/goals/?name=${name}&target=${target}&year=${year}`, {
      method: "POST",
    }),
  updateGoal: (id: number, name: string, target: number, year: number) =>
    api.fetch(`/goals/${id}?name=${name}&target=${target}&year=${year}`, {
      method: "PUT",
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
};
