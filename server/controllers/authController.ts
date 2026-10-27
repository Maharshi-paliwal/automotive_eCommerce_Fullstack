import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'

const generateToken=(id:string)=>{
return jwt.sign({id}, process.env.JWT_SECRET as string , {expiresIn:"15d"})
}

//admin check

const getAdminStatus=(email:string | null | undefined):boolean=>{
  if(!email) return false;
  const adminEmails=process.env.ADMIN_EMAILS ?process.env.ADMIN_EMAILS.split(",").map((e)=>e.trim().toLowerCase()):[]

  return adminEmails.includes(email.toLowerCase())
}

export const register=async(req:Request, res:Response)=>{
  const {name, email,password}= req.body
  if(!name || !email || !password){
    return res.status(400).json({
      message:"please provide all fields"
    })
  }

  const existinguser=await prisma.user.findUnique({where:{email:email.toLowerCase()}})
  if(existinguser){
     return res.status(400).json({
      message:"user already exists"
    })
  }
  
   const hashedPassword= await bcrypt.hash(password,7)
  const user= await prisma.user.create({
     data: {id: randomUUID(), name, email:email.toLowerCase(), password:hashedPassword}
  })

  const token=generateToken(user.id)
  const userData:any={...user}
  delete userData.password;
  userData.isAdmin=getAdminStatus(userData.email)

  res.status(201).json({user:userData, token})

}


export const login=async(req:Request, res:Response)=>{
  const {email,password}= req.body
  if(!email || !password){
    return res.status(400).json({
      message:"please provide email and passsword"
    })
  }

  const user=await prisma.user.findUnique({where:{email:email.toLowerCase()}, include:{addresses:true}})

  if(!user){
     return res.status(401).json({
      message:"user does not exist"
    })
  }

  const isMatch= await bcrypt.compare(password, user.password ?? '')
  if(!isMatch){
    return res.status(401).json({
      message:"invalid email or password"
    })
  }
  
  const token=generateToken(user.id)
  const userData:any={...user}
  delete userData.password;
  userData.isAdmin=getAdminStatus(userData.email)

  res.json({user:userData, token})

}
