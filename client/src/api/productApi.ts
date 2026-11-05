import { http, recordId } from "./http";
import type { Product } from "../types";

const productRecord = (item: Record<string, unknown>) => recordId({
  ...item,
  isGenuine: item.iGenuine,
} as Record<string, unknown> & { id?: string; _id?: string }) as unknown as Product;

export async function listProducts(params: Record<string, string>) {
  const { data } = await http.get("/products", { params });
  return (data.products as Record<string, unknown>[]).map(productRecord);
}
export async function getProduct(id: string) {
  const { data } = await http.get(`/products/${id}`);
  return productRecord(data.product);
}
export async function getFlashDeals() {
  const { data } = await http.get("/products/flash-deals");
  return (data.products as Record<string, unknown>[]).map(productRecord);
}
export async function createProduct(payload: Record<string, unknown>) {
  const { data } = await http.post("/products", payload);
  return productRecord(data.product);
}
export async function updateProduct(id: string, payload: Record<string, unknown>) {
  const { data } = await http.put(`/products/${id}`, payload);
  return productRecord(data.product);
}
export async function deleteProduct(id: string) { return http.delete(`/products/${id}`); }
export async function uploadProductImage(file: File) {
  const body = new FormData(); body.append("image", file);
  const { data } = await http.post("/upload", body);
  return data.key as string;
}
