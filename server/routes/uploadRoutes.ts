
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import auth from "../middlewares/Auth.js";
import admin from "../middlewares/Admin.js";
import { s3Client, bucketName } from "../config/s3.js";

const uploadRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPEG, PNG, WebP, and AVIF images are allowed")
      );
    }

    callback(null, true);
  },
});

uploadRouter.post(
  "/",
  auth,
  admin,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No image file provided",
        });
      }

      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      };

      const key = `products/${randomUUID()}.${extensionByType[req.file.mimetype]}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      return res.status(201).json({
        message: "Image uploaded successfully",
        key,
      });
    } catch (error: unknown) {
      console.error("S3 image upload failed:", error);

      return res.status(500).json({
        message: "Image upload failed",
      });
    }
  }
);

export default uploadRouter;
