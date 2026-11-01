import express from 'express'
import { createProduct, deleteProduct, getFlashDeals, getProduct, getproducts, updateProduct } from '../controllers/productController.js'
const productrouter=express.Router()
import auth from '../middlewares/Auth.js';
import admin from '../middlewares/Admin.js';

productrouter.get("/flash-deals", getFlashDeals);
productrouter.get("/", getproducts)
productrouter.get("/:id", getProduct)
productrouter.post("/", auth, admin, createProduct )
productrouter.put("/:id", auth,admin, updateProduct)
productrouter.delete("/:id", auth,admin,deleteProduct)

export default productrouter
