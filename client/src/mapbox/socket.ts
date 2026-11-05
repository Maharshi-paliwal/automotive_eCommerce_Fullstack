import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
  auth: (callback) => {
    const isDeliveryRoute = window.location.pathname.startsWith("/delivery");
    const token = isDeliveryRoute
      ? localStorage.getItem("deliveryToken") || localStorage.getItem("token")
      : localStorage.getItem("token") || localStorage.getItem("deliveryToken");
    callback(token ? { token } : {});
  },
});
