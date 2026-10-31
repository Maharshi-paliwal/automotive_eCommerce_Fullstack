import { NextFunction } from "express";
import type {Request, Response} from 'express'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/runtimeConfig.js'

const auth=(req:Request, res:Response, next:NextFunction)=>{
  try{
    const authHeader=req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')){
      return res.status(401).json({message:'No token provided, authorization denied'})
    }
    const token=authHeader.split(" ")[1]
    const decoded=jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as {id:string}
    req.user={id:decoded.id}
    next()
  }catch{
    return res.status(401).json({
      message:"Token is not valid"
    })
  }
}

export default auth;
