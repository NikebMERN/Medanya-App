import axios from "axios";
import { env } from "../utils/env";
import { useAuthStore } from "../store/auth.store";
import { getDeviceId } from "../utils/deviceId";

const client = axios.create({
  baseURL: `${env.apiUrl}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const deviceId = await getDeviceId();
    if (deviceId && deviceId !== "unknown") config.headers["X-Device-ID"] = deviceId;
  } catch (_) {}
  if (config.data && typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default client;
