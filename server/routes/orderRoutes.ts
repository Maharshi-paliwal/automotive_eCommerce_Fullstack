import express from 'express'
import auth from '../middlewares/Auth.js'
import { createOrder, verifyOrderPayment, getAllOrders, getUserOrder, getOrder, updateOrderStuatus, getOrderLocation } from '../controllers/orderController.js'
import admin from '../middlewares/Admin.js'
const orderRouter = express.Router()
orderRouter.post('/', auth,createOrder)
orderRouter.post('/payment/verify', auth, verifyOrderPayment)
orderRouter.get('/', auth,getUserOrder)
orderRouter.get('/all', auth,admin,getAllOrders)
orderRouter.get('/:id', auth,getOrder)
orderRouter.put('/:id/status', auth, admin,updateOrderStuatus)
orderRouter.get('/:id/location', auth,getOrderLocation)

export default orderRouter

