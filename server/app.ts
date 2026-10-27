import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import authRouter from './routes/authRoutes.js'
import productrouter from './routes/productRoutes.js'
import uploadRouter from './routes/uploadRoutes.js'
import orderRouter from './routes/orderRoutes.js'

const app=express()

app.use(cors())
app.use(express.json())

app.get('/', (_req:Request, res:Response) => res.send('hello world'))

app.use('/api/auth', authRouter)
app.use('/api/products', productrouter)
app.use('/api/upload', uploadRouter)
app.use('/api/orders', orderRouter)

app.use((error:unknown, _req:Request, res:Response, _next:NextFunction)=>{
  console.error(error)
  res.status(500).json({ msaage:"server error" })
})

export default app
