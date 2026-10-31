import { NextFunction } from "express";
import type {Request, Response} from 'express'
import {prisma} from '../config/prisma.js'

const admin=async (req:Request, res:Response, next:NextFunction)=>{
  try{
    const userId=req.user?.id;
    if(!userId){
      return res.status(401).json({message:"unauthorize"})
    }
    
    const user= await prisma.user.findUnique({where:{id:userId}})
    if(!user){
      return res.status(401).json({message:"user not found"})
    }
     const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS
      .split(",")
      .map((e) => e.trim().toLowerCase())
  : [];

      if( user.email && adminEmails.includes(user.email.toLowerCase())){
        if(req.user) req.user.isAdmin=true;
        next()
      }else{
      return res.status(403).json({message:"admin access required"})

      }

  }catch{
    return res.status(500).json({
      message:"Admin verification failed"
    })
  }
}

export default admin;
