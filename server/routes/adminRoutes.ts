import express from 'express'
import auth from '../middlewares/Auth.js'
import admin from '../middlewares/Admin.js'
import { assignDeliverypartner, createDeliveryPartner, getAdminStats, getDeliveryPartners, updateDeliverypartner } from '../controllers/adminControllers.js'
const adminRouter= express.Router()
adminRouter.get('/stats', auth,admin, getAdminStats)
adminRouter.get('/delivery-partners', auth,admin, getDeliveryPartners)
adminRouter.post('/delivery-partners', auth,admin, createDeliveryPartner)
adminRouter.put('/delivery-partners/:id', auth,admin, updateDeliverypartner)
adminRouter.put('/orders/:id/assign', auth,admin,assignDeliverypartner)
export default  adminRouter



