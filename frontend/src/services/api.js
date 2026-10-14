import axios from "axios";

const api = axios.create({
  baseURL: (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, ""),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let Axios set the multipart Content-Type for FormData.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (config.data !== undefined) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
    }

    return Promise.reject(error);
  }
);

export default api;