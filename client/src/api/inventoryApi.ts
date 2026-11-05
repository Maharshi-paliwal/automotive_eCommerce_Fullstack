import { http } from "./http";

export interface InventoryProduct { id: string; name: string | null; image: string | null; partNumber: string | null; stock: number | null; price: number | null; }
export interface InventoryMovement { id: string; movementType: string; quantityChange: number | null; stockBefore: number | null; stockAfter: number | null; reason: string; createdAt: string; adminActor: { id: string; name: string | null; email: string | null } | null; }
export async function getInventory(params: { search?: string; filter?: string; threshold?: number; page?: number }) {
  const { data } = await http.get("/admin/inventory", { params }); return data as {
    products: InventoryProduct[]; pagination: { page: number; limit: number; total: number };
    overview: { totalProducts: number; totalUnitsInStock: number; lowStockProducts: number; outOfStockProducts: number; unknownStockProducts: number }; threshold: number;
  };
}
export async function adjustInventory(productId: string, quantity: number, reason: string) {
  const { data } = await http.post(`/admin/inventory/${productId}/adjust`, { quantity, reason }); return data;
}
export async function getInventoryHistory(productId: string) {
  const { data } = await http.get(`/admin/inventory/${productId}/history`); return data.history as InventoryMovement[];
}
