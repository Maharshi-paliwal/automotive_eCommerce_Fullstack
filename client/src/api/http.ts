import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const http = axios.create({ baseURL: `${baseURL}/api`, timeout: 15000 });

http.interceptors.request.use((config) => {
  const path = config.url ?? "";
  const token = path.startsWith("/delivery")
    ? localStorage.getItem("deliveryToken")
    : localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      return Promise.reject(new Error(typeof message === "string" ? message : error.message || "Network request failed"));
    }
    return Promise.reject(error);
  },
);

export const recordId = <T extends { id?: string; _id?: string }>(record: T): T & { _id: string } => ({
  ...record,
  _id: record._id ?? record.id ?? "",
});

export const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
