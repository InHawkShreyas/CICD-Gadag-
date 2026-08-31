import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================= REQUEST ================= */

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // Skip login endpoint
    const isLoginRequest = config.url?.includes("/login");

    if (token && !isLoginRequest) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE ================= */

const PAYMENT_PATHS = ["/fee-response", "/fee-receipt"];

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    const isLoginRequest = url.includes("/login");
    const isPaymentPage = PAYMENT_PATHS.some((p) =>
      window.location.pathname.includes(p)
    );

    // 🚨 Handle unauthorized
    if (status === 401 && !isLoginRequest && !isPaymentPage) {
      // ✅ Clean only auth data
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");

      // ✅ Redirect safely
      if (!window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default API;