import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
  auth: (callback) => {
    const token = localStorage.getItem("token");
    callback(token ? { token } : {});
  },
});
