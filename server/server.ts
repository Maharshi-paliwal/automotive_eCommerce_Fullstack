import express, {NextFunction, Request, Response} from 'express'
import cors from 'cors'
const app=express()
import 'dotenv/config'
import authRouter from './routes/authRoutes.js'
import productrouter from './routes/productRoutes.js'
import uploadRouter from './routes/uploadRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import addressRouter from './routes/addressRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import deliverypartnerRouter from './routes/deliverypartnerRoutes.js'

const port=process.env.PORT || 5000

app.use(cors())
app.use(express.json())



app.get('/',(req:Request, res:Response)=>(
 res.send('hello world')
))

app.use('/api/auth', authRouter)
app.use('/api/products', productrouter)
app.use('/api/upload', uploadRouter)
app.use('/api/orders', orderRouter)
app.use('/api/addresses', addressRouter)
app.use('/api/admin', adminRouter)
app.use('/api/delivery', deliverypartnerRouter)

// error handling
app.use((error:any, req:Request, res:Response, next:NextFunction)=>{
console.error(error)
res.status(500).json({
  msaage:"server error"
})
})


app.listen(port, ()=>(
  console.log(`server running on ${port}`)
))
