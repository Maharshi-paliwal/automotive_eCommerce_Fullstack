import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADDRESS_FIELDS = new Set(["label", "address", "city", "state", "zip", "isDefault", "lat", "lng"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseCoordinate = (value: unknown, minimum: number, maximum: number): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
};

const validateAddress = (body: unknown, partial: boolean): { data?: Record<string, unknown>; error?: string } => {
  if (!isRecord(body) || Object.keys(body).some((key) => !ADDRESS_FIELDS.has(key))) return { error: "Invalid address fields" };
  const textFields = ["label", "address", "city", "state", "zip"] as const;
  const data: Record<string, unknown> = {};
  for (const key of textFields) {
    const value = body[key];
    if (value === undefined && partial) continue;
    if (typeof value !== "string" || !value.trim() || value.length > (key === "address" ? 300 : 100)) return { error: `Invalid ${key}` };
    data[key] = value.trim();
  }
  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") return { error: "isDefault must be a boolean" };
    data.isDefault = body.isDefault;
  }
  const coordinatesProvided = body.lat !== undefined || body.lng !== undefined;
  if (!partial || coordinatesProvided) {
    const lat = parseCoordinate(body.lat, -90, 90);
    const lng = parseCoordinate(body.lng, -180, 180);
    if (lat === null || lng === null) return { error: "Valid location coordinates are required" };
    data.lat = lat;
    data.lng = lng;
  }
  return { data };
};

export const getAddresses = async (req: Request, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ addresses });
};

export const addAddress = async (req: Request, res: Response) => {
  const parsed = validateAddress(req.body, false);
  if (!parsed.data) return res.status(400).json({ message: parsed.error });

  const currentAddresses = await prisma.address.findMany({ where: { userId: req.user!.id } });
  const makeDefault = currentAddresses.length === 0 || parsed.data.isDefault === true;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: { ...parsed.data, userId: req.user!.id, isDefault: makeDefault } as Prisma.AddressUncheckedCreateInput,
    });
  });
  return res.status(201).json({ address });
};

export const updateAddress = async (req: Request, res: Response) => {
  const addressId = typeof req.params.id === "string" ? req.params.id : "";
  if (!UUID_PATTERN.test(addressId)) return res.status(404).json({ message: "Address not found" });
  const parsed = validateAddress(req.body, true);
  if (!parsed.data) return res.status(400).json({ message: parsed.error });

  const ownedAddress = await prisma.address.findFirst({ where: { id: addressId, userId: req.user!.id }, select: { id: true } });
  if (!ownedAddress) return res.status(404).json({ message: "Address not found" });
  const addresses = await prisma.$transaction(async (tx) => {
    if (parsed.data!.isDefault === true) {
      await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    await tx.address.updateMany({
      where: { id: addressId, userId: req.user!.id },
      data: parsed.data as Prisma.AddressUpdateManyMutationInput,
    });
    return tx.address.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "asc" } });
  });
  return res.json({ addresses });
};

export const deleteAddress = async (req: Request, res: Response) => {
  const addressId = typeof req.params.id === "string" ? req.params.id : "";
  if (!UUID_PATTERN.test(addressId)) return res.status(404).json({ message: "Address not found" });
  const deleted = await prisma.address.deleteMany({ where: { id: addressId, userId: req.user!.id } });
  if (deleted.count !== 1) return res.status(404).json({ message: "Address not found" });
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "asc" } });
  return res.json({ addresses });
};
