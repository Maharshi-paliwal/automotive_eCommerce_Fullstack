import { http, recordId } from "./http";
export async function myDeliveries(status: "active" | "completed") { const { data } = await http.get("/delivery/my-deliveries", { params: { status } }); return (data.orders as Record<string, unknown>[]).map(recordId); }
export async function updateDeliveryStatus(id: string, status: string) { const { data } = await http.put(`/delivery/my-deliveries/${id}/status`, { status }); return recordId(data.order); }
export async function completeDelivery(id: string, otp: string) { const { data } = await http.put(`/delivery/my-deliveries/${id}/complete`, { otp }); return recordId(data.order); }
export async function cancelDelivery(id: string, reason: string) { const { data } = await http.put(`/delivery/my-deliveries/${id}/cancel`, { reason }); return recordId(data.order); }
export async function updateDeliveryLocation(id: string, lat: number, lng: number) { const { data } = await http.put(`/delivery/my-deliveries/${id}/location`, { lat, lng }); return data; }
