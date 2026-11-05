import express from "express";
import auth from "../middlewares/Auth.js";
import { createComplaint, getCustomerComplaint, listCustomerComplaints } from "../controllers/complaintController.js";

const complaintRouter = express.Router();

complaintRouter.post("/", auth, createComplaint);
complaintRouter.get("/", auth, listCustomerComplaints);
complaintRouter.get("/:complaintId", auth, getCustomerComplaint);

export default complaintRouter;
