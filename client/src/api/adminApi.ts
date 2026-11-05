import { http, recordId } from "./http";
export async function getAdminStats() { const { data } = await http.get("/admin/stats"); return { ...data, outOfStock: data.outofStock, recentOrders: (data.recentOrders as Record<string, unknown>[]).map(recordId) }; }
export async function listDeliveryPartners() { const { data } = await http.get("/admin/delivery-partners"); return (data.partners as Record<string, unknown>[]).map(recordId); }
export async function createDeliveryPartner(payload: Record<string, unknown>) { const { data } = await http.post("/admin/delivery-partners", payload); return recordId(data.partner); }
export async function updateDeliveryPartner(id: string, payload: Record<string, unknown>) { const { data } = await http.put(`/admin/delivery-partners/${id}`, payload); return recordId(data.partner); }
