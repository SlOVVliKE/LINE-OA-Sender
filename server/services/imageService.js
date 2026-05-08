import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/env.js";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export function configureCloudinary() {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true
  });
}

export function validateUpload(file) {
  if (!file) {
    return "กรุณาเลือกรูปภาพ";
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return "รองรับเฉพาะไฟล์ JPG หรือ PNG";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "ขนาดรูปต้องไม่เกิน 10 MB";
  }

  return null;
}

export function uploadImageBuffer(file) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "line-oa-sender",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        const previewUrl = cloudinary.url(result.public_id, {
          secure: true,
          transformation: [
            { width: 1024, crop: "limit", quality: "auto:eco" }
          ],
          format: "png"
        });

        resolve({
          publicId: result.public_id,
          originalUrl: result.secure_url,
          previewUrl,
          bytes: result.bytes,
          format: result.format,
          width: result.width,
          height: result.height
        });
      }
    );

    stream.end(file.buffer);
  });
}
