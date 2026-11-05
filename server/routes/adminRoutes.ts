import express from 'express'
import auth from '../middlewares/Auth.js'
import admin from '../middlewares/Admin.js'
import { assignDeliverypartner, createDeliveryPartner, getAdminStats, getDeliveryPartners, updateDeliverypartner } from '../controllers/adminControllers.js'
import { adjustInventory, getInventoryHistory, listInventory } from '../controllers/inventoryController.js'
import { getNotificationUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js'
import { getAdminComplaint, listAdminComplaints, updateAdminComplaintStatus } from '../controllers/complaintController.js'
const adminRouter= express.Router()
adminRouter.get('/notifications', auth, admin, listNotifications)
adminRouter.get('/notifications/unread-count', auth, admin, getNotificationUnreadCount)
adminRouter.patch('/notifications/read-all', auth, admin, markAllNotificationsRead)
adminRouter.patch('/notifications/:notificationId/read', auth, admin, markNotificationRead)
adminRouter.get('/complaints', auth, admin, listAdminComplaints)
adminRouter.get('/complaints/:complaintId', auth, admin, getAdminComplaint)
adminRouter.patch('/complaints/:complaintId/status', auth, admin, updateAdminComplaintStatus)
adminRouter.get('/inventory', auth, admin, listInventory)
adminRouter.post('/inventory/:productId/adjust', auth, admin, adjustInventory)
adminRouter.get('/inventory/:productId/history', auth, admin, getInventoryHistory)
adminRouter.get('/stats', auth,admin, getAdminStats)
adminRouter.get('/delivery-partners', auth,admin, getDeliveryPartners)
adminRouter.post('/delivery-partners', auth,admin, createDeliveryPartner)
adminRouter.put('/delivery-partners/:id', auth,admin, updateDeliverypartner)
adminRouter.put('/orders/:id/assign', auth,admin,assignDeliverypartner)
export default  adminRouter

