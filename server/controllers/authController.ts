import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import { getJwtSecret } from "../config/runtimeConfig.js";

const PASSWORD_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken=(id:string)=>{
return jwt.sign({id}, getJwtSecret(), {expiresIn:"15d", algorithm:"HS256"})
}

//admin check

const getAdminStatus=(email:string | null | undefined):boolean=>{
  if(!email) return false;
  const adminEmails=process.env.ADMIN_EMAILS ?process.env.ADMIN_EMAILS.split(",").map((e)=>e.trim().toLowerCase()):[]

  return adminEmails.includes(email.toLowerCase())
}

export const register=async(req:Request, res:Response)=>{
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  if(!name || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254 || typeof password !== "string" || password.length < 8 || password.length > 128){
    return res.status(400).json({
      message:"Please provide a valid name, email, and password of at least 8 characters"
    })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(email)) {
    return res.status(403).json({ message: "This email requires trusted account provisioning" });
  }

  const existinguser=await prisma.user.findUnique({where:{email}})
  if(existinguser){
     return res.status(400).json({
      message:"user already exists"
    })
  }
  
   const hashedPassword= await bcrypt.hash(password,PASSWORD_ROUNDS)
  const user= await prisma.user.create({
     data: {id: randomUUID(), name, email, password:hashedPassword}
  })

  const token=generateToken(user.id)
  const userData:any={...user}
  delete userData.password;
  userData.isAdmin=getAdminStatus(userData.email)

  res.status(201).json({user:userData, token})

}


export const login=async(req:Request, res:Response)=>{
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  if(!EMAIL_PATTERN.test(email) || email.length > 254 || typeof password !== "string" || password.length === 0 || password.length > 1024){
    return res.status(400).json({
      message:"please provide email and passsword"
    })
  }

  const user=await prisma.user.findUnique({where:{email}, include:{addresses:true}})

  if(!user){
     return res.status(401).json({ message:"invalid email or password" })
  }

  const isMatch= await bcrypt.compare(password, user.password ?? '')
  if(!isMatch){
    return res.status(401).json({
      message:"invalid email or password"
    })
  }

  if (bcrypt.getRounds(user.password ?? "") < PASSWORD_ROUNDS) {
    const upgradedHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { password: upgradedHash } });
  }
  
  const token=generateToken(user.id)
  const userData:any={...user}
  delete userData.password;
  userData.isAdmin=getAdminStatus(userData.email)

  res.json({user:userData, token})

}
