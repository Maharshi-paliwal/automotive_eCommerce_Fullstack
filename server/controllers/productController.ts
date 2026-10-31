import type {Request, Response} from 'express'
import { randomUUID } from 'node:crypto'
import {prisma} from '../config/prisma.js'
export const getFlashDeals = async(req:Request, res: Response)=>{
  const products= await prisma.product.findMany({
    where :{stock: {gt:0}},
    orderBy:{originalPrice:"desc"}
  })

  const productsWithDiscount = products.map((p: any) => {
  const discount =
    p.originalPrice && p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : 0;

  return {
    ...p,
    discount,
  };
});

res.json({produtcs:productsWithDiscount.slice(0,8)})
}

//get /api/products

  const getproducts = async(req:Request, res:Response) => {
  const {category, brand,search, minPrice, maxPrice, sort}=req.query

  const where:any= {}
  if(category && category !== "all")where.category = category as string;
   if(brand && brand !== "all")where.brand = brand as string;
  if(search) where.name={contains: search as string , mode: "insensitive"}
  if(minPrice || maxPrice){
    where.price={}
    if(minPrice) where.price.gte=Number(minPrice)
    if(maxPrice) where.price.gte=Number(maxPrice)
    
  } 
  const orderBy:any ={}
  if(sort==="price-low") orderBy.price='asc'
  else if(sort==="price-high") orderBy.price='desc'
  else orderBy.createdAt='desc'
  const products = await prisma.product.findMany({where, orderBy})
  const productsWithDiscount= products.map((p:any)=>{
    const discount =
    p.originalPrice && p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : 0;
      return {...p,discount}
  })
  res.json({products:productsWithDiscount})
}

//  get products by id 
export const getProduct=async (req:Request, res:Response)=>{
  const product= await prisma.product.findUnique({where: {id:req.params.id as string}})
  if(!product){
    res.status(404).json({message:"product not found"})
    return;
  }

   const discount =
    product.originalPrice && product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
    res.json({product:{...product, discount}})
}

const productFields = new Set([
  "name", "brand", "description", "price", "originalPrice", "image", "category", "unit",
  "stock", "isOrganic", "iGenuine", "compatibleVehicles", "partNumber", "rating", "reviewCount",
]);
const productTextLimits: Record<string, number> = {
  name: 200, brand: 100, description: 5000, image: 2000, category: 100, unit: 50, partNumber: 100,
};
const validateProductInput = (body: unknown, partial: boolean): Record<string, unknown> | null => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => !productFields.has(key))) return null;
  if (!partial && (typeof input.name !== "string" || !input.name.trim() || typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0)) return null;
  for (const [field, maxLength] of Object.entries(productTextLimits)) {
    const value = input[field];
    if (value !== undefined && value !== null && (typeof value !== "string" || value.length > maxLength)) return null;
  }
  for (const field of ["price", "originalPrice", "rating"] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) return null;
  }
  if (input.rating !== undefined && input.rating !== null && (input.rating as number) > 5) return null;
  for (const field of ["stock", "reviewCount"] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isInteger(value) || value < 0)) return null;
  }
  for (const field of ["isOrganic", "iGenuine"] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && typeof value !== "boolean") return null;
  }
  if (input.compatibleVehicles !== undefined && (!Array.isArray(input.compatibleVehicles) || input.compatibleVehicles.length > 100 || input.compatibleVehicles.some((value) => typeof value !== "string" || value.length > 200))) return null;
  return Object.fromEntries(keys.map((key) => [key, typeof input[key] === "string" ? (input[key] as string).trim() : input[key]]));
};

// create product api 
export const createProduct=  async(req:Request, res:Response)=>{
  const data = validateProductInput(req.body, false);
  if (!data) return res.status(400).json({ message: "Invalid product data" });
  const product= await prisma.product.create({data: { ...data, id: randomUUID() }})
  res.status(201).json({product})
}

// update product api 
export const updateProduct=  async(req:Request, res:Response)=>{
  const productId = req.params.id;

if (typeof productId !== "string") {
  return res.status(400).json({ message: "Invalid product ID" });
}

const data = validateProductInput(req.body, true);
if (!data) return res.status(400).json({ message: "Invalid product data" });

const product = await prisma.product.update({
  where: { id: productId },
  data,
});
res.json({ product });
}

//delete product
export const deleteProduct=  async(req:Request, res:Response)=>{
const productId = req.params.id;

if (typeof productId !== "string") {
  return res.status(400).json({ message: "Invalid product ID" });
}

await prisma.product.delete({
  where: { id: productId },
});
res.json({ message: "Deleted" });
}






