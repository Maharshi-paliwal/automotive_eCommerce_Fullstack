import { http, recordId } from "./http";
import type { Order } from "../types";

const orderRecord = (order: Record<string, unknown>) => recordId(order) as unknown as Order;
export async function listOrders() { const { data } = await http.get("/orders"); return (data as Record<string, unknown>[]).map(orderRecord); }
export async function getOrder(id: string) { const { data } = await http.get(`/orders/${id}`); return orderRecord(data.order); }
export async function createOrder(payload: { items: { product: string; quantity: number }[]; shippingAddress: unknown; paymentMethod: "cash" | "card" }) {
  const { data } = await http.post("/orders", payload); return { order: orderRecord(data.order), payment: data.payment as { id: string; amount: number; currency: string; keyId: string } | undefined };
}
export async function verifyPayment(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const { data } = await http.post("/orders/payment/verify", payload); return data;
}
export async function adminOrders() { const { data } = await http.get("/orders/all"); return (data.orders as Record<string, unknown>[]).map(orderRecord); }
export async function updateOrderStatus(id: string, status: string) { const { data } = await http.put(`/orders/${id}/status`, { status }); return orderRecord(data.order); }
export async function assignPartner(id: string, partnerId: string) { const { data } = await http.put(`/admin/orders/${id}/assign`, { partnerId }); return orderRecord(data.order); }
export async function getOrderLocation(id: string) { const { data } = await http.get(`/orders/${id}/location`); return data; }
