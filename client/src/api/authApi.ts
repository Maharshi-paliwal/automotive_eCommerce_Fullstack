import { http, recordId } from "./http";

export async function authenticate(mode: "login" | "register", payload: { email: string; password: string; name?: string }) {
  const { data } = await http.post(`/auth/${mode}`, payload);
  const user = recordId(data.user);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function loginDelivery(payload: { email: string; password: string }) {
  const { data } = await http.post("/delivery/login", payload);
  localStorage.setItem("deliveryToken", data.token);
  localStorage.setItem("deliveryPartner", JSON.stringify(recordId(data.partner)));
  return recordId(data.partner);
}

export function logoutDelivery() {
  localStorage.removeItem("deliveryToken");
  localStorage.removeItem("deliveryPartner");
}
