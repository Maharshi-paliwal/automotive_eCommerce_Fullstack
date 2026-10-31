import type { Request,Response } from "express"
import {prisma} from '../config/prisma.js'
import bcrypt from 'bcrypt'
import { randomInt } from 'node:crypto'



export const getAdminStats = async (req: Request, res: Response) => {
  const [
    totalOrders,
    totalUsers,
    totalProducts,
    outofStock,
    totalPartners,
    brands,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        NOT: [{ paymentMethod: "card", isPaid: false }],
      },
    }),
    prisma.user.count(),
    prisma.product.count(),
    prisma.product.count({
      where: { stock: 0 },
    }),
    prisma.deliveryPartner.count(),
    prisma.product.groupBy({
      by: ["brand"],
      where: {
        brand: { not: null },
      },
    }),
    prisma.order.findMany({
      where: {
        NOT: [{ paymentMethod: "card", isPaid: false }],
      },
      orderBy: { createdAt: "desc" },
      take: 9,
      include: {
        user: {
          select: { name: true, email: true },
        },
        deliveryPartner: {
          select: { name: true, phone: true },
        },
      },
    }),
  ]);

  const totalBrands = brands.filter(
    (item) => item.brand?.trim() !== "",
  ).length;

  res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    outofStock,
    totalPartners,
    totalBrands,
    recentOrders,
  });
};



// get deliery partner list for admin 
export const getDeliveryPartners= async(req:Request, res:Response)=>{
  const partners= await prisma.deliveryPartner.findMany(
    {orderBy:{createdAt:"desc"}}
  )
  res.json({partners})
}

//create delivery partner profile

export const createDeliveryPartner=async(req:Request, res:Response)=>{
  const {name,email,password,phone,vehicleType}= req.body ?? {}
  if(typeof name !== "string" || !name.trim() || name.length > 100 || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" || password.length < 8 || password.length > 128 || typeof phone !== "string" || !phone.trim() || phone.length > 30 ||
    !["bike", "scooter", "car"].includes(vehicleType)){
    return res.status(400).json({message:"Please provide valid delivery partner details"})
  }
  const hashedPassword= await bcrypt.hash(password,12)
  const partner=await prisma.deliveryPartner.create({
    data:{name:name.trim(),email:email.trim().toLowerCase(),password:hashedPassword,phone:phone.trim(),vehicleType}
  })
   return res.status(201).json({partner})
}

//update delivery partner
export const updateDeliverypartner=async(req:Request, res:Response)=>{
  const {name,phone,vehicleType, isActive}= req.body ?? {}
  const allowedFields = new Set(["name", "phone", "vehicleType", "isActive"])
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).some((key) => !allowedFields.has(key))) {
    return res.status(400).json({message:"Invalid delivery partner fields"})
  }
  const data:any={}
  if(name !== undefined) {
    if(typeof name !== "string" || !name.trim() || name.length > 100) return res.status(400).json({message:"Invalid name"})
    data.name=name.trim()
  }
  if(phone !== undefined) {
    if(typeof phone !== "string" || !phone.trim() || phone.length > 30) return res.status(400).json({message:"Invalid phone"})
    data.phone=phone.trim()
  }
  if(vehicleType !== undefined) {
    if(typeof vehicleType !== "string" || !["bike", "scooter", "car"].includes(vehicleType)) return res.status(400).json({message:"Invalid vehicle type"})
    data.vehicleType=vehicleType
  }
  if(isActive !== undefined) {
    if(typeof isActive !== "boolean") return res.status(400).json({message:"isActive must be a boolean"})
    data.isActive=isActive
  }
  if(Object.keys(data).length === 0) return res.status(400).json({message:"At least one field is required"})
  try{
    const partner=await prisma.deliveryPartner.update({
      where:{id:req.params.id as string},
      data
    })
    res.json({partner})
  }catch(err){
    res.status(404).json({message: "partner not found"})
  }
  
}

//assign delivery partner
export const assignDeliverypartner=async(req:Request, res:Response)=>{
  const {partnerId}= req.body ?? {}
  const orderId = typeof req.params.id === "string" ? req.params.id : ""
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(orderId) || typeof partnerId !== "string" || !uuidPattern.test(partnerId)) {
    return res.status(400).json({message:"Valid order and delivery partner IDs are required"})
  }
  const order=await prisma.order.findUnique({
    where:{id:orderId}

  })
  if (!order) return res.status(404).json({message:"Order not found"})
  const partner=await prisma.deliveryPartner.findUnique({
    where:{id:partnerId}
  })
  if (!partner || !partner.isActive) return res.status(404).json({message:"Active delivery partner not found"})
  if (order.status === "Delivered" || order.status === "Cancelled") return res.status(409).json({message:"Order cannot be assigned in its current status"})
  const otp=String(randomInt(100000, 1000000))
  const history :any[]= Array.isArray(order.statusHistory)? [...order.statusHistory] :[]
  const status = order.status === "Placed" || order.status === "Confirmed" ? "Assigned" : order.status
  if (status === "Assigned" && order.status !== "Assigned") {
    history.push({ status:"Assigned", note:`Assigned to ${partner.name}`, timestamp:new Date().toISOString() })
  }
 const updated = await prisma.order.updateMany({
  where:{id:order.id, status:order.status, deliveryPartnerId:order.deliveryPartnerId},
  data:{deliveryPartnerId:partner.id, deliveryOtp:otp, status, statusHistory:history}
 })
 if (updated.count !== 1) return res.status(409).json({message:"Order changed before it could be assigned"})
 const updatedOrder = await prisma.order.findUnique({where:{id:order.id}})
 return res.json({order:updatedOrder})
}
