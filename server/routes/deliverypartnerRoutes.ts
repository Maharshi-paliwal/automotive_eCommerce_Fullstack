import express from 'express'
import auth from '../middlewares/Auth.js'
import admin from '../middlewares/Admin.js'
import deliveryAuth from '../middlewares/deliveryAuth.js'
import { cancelDelivery, completeDelivery, getDeliveryDetail, getMyDeliveries, loginPartner, updateDeliveryStatus, updateLocation } from '../controllers/deliverypartnerController.js'
const deliverypartnerRouter=express.Router()

deliverypartnerRouter.post('/login', loginPartner)
deliverypartnerRouter.get('/my-deliveries', deliveryAuth, getMyDeliveries)
deliverypartnerRouter.get('/my-deliveries/:id', deliveryAuth, getDeliveryDetail)
deliverypartnerRouter.put('/my-deliveries/:id/complete', deliveryAuth, completeDelivery)
deliverypartnerRouter.put('/my-deliveries/:id/cancel', deliveryAuth, cancelDelivery)
deliverypartnerRouter.put('/my-deliveries/:id/status', deliveryAuth, updateDeliveryStatus)
deliverypartnerRouter.put('/my-deliveries/:id/location', deliveryAuth, updateLocation)


export default deliverypartnerRouter
