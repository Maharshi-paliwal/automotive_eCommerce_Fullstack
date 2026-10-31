import express from 'express'
import { login, register } from '../controllers/authController.js'
import { authLoginRateLimit, authRegisterRateLimit } from '../middlewares/rateLimit.js'
const authRouter= express.Router()
authRouter.post('/register', authRegisterRateLimit, register)
authRouter.post('/login', authLoginRateLimit, login)

export default authRouter

