import { http, recordId } from "./http";
import type { Address } from "../types";
const addressRecord = (value: Record<string, unknown>) => recordId(value) as unknown as Address;
export async function listAddresses() { const { data } = await http.get("/addresses"); return (data.addresses as Record<string, unknown>[]).map(addressRecord); }
export async function addAddress(payload: Omit<Address, "_id">) { const { data } = await http.post("/addresses", payload); return addressRecord(data.address); }
export async function updateAddress(id: string, payload: Partial<Address>) { const { data } = await http.put(`/addresses/${id}`, payload); return (data.addresses as Record<string, unknown>[]).map(addressRecord); }
export async function deleteAddress(id: string) { const { data } = await http.delete(`/addresses/${id}`); return (data.addresses as Record<string, unknown>[]).map(addressRecord); }
