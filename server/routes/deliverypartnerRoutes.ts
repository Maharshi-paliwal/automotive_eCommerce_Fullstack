import express from 'express'
import deliveryAuth from '../middlewares/deliveryAuth.js'
import { deliveryLocationRateLimit, deliveryLoginRateLimit, deliveryOtpRateLimit } from '../middlewares/rateLimit.js'
import { cancelDelivery, completeDelivery, getDeliveryDetail, getMyDeliveries, loginPartner, updateDeliveryStatus, updateLocation } from '../controllers/deliverypartnerController.js'
const deliverypartnerRouter=express.Router()

deliverypartnerRouter.post('/login', deliveryLoginRateLimit, loginPartner)
deliverypartnerRouter.get('/my-deliveries', deliveryAuth, getMyDeliveries)
deliverypartnerRouter.get('/my-deliveries/:id', deliveryAuth, getDeliveryDetail)
deliverypartnerRouter.put('/my-deliveries/:id/complete', deliveryAuth, deliveryOtpRateLimit, completeDelivery)
deliverypartnerRouter.put('/my-deliveries/:id/cancel', deliveryAuth, cancelDelivery)
deliverypartnerRouter.put('/my-deliveries/:id/status', deliveryAuth, updateDeliveryStatus)
deliverypartnerRouter.put('/my-deliveries/:id/location', deliveryAuth, deliveryLocationRateLimit, updateLocation)


export default deliverypartnerRouter
