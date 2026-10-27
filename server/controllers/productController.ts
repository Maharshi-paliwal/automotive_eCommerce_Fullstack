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

// create product api 
export const createProduct=  async(req:Request, res:Response)=>{
  const product= await prisma.product.create({data: { ...req.body, id: randomUUID() }})
  res.status(201).json({product})
}

// update product api 
export const updateProduct=  async(req:Request, res:Response)=>{
  const product= await prisma.product.update({where : {id:req.params.id}, data:req.body})
  res.json({product})
}

//delete product
export const deleteProduct=  async(req:Request, res:Response)=>{
  await prisma.product.delete({where : {id:req.params.id}})
  res.json({message:"Deleted"})
}






