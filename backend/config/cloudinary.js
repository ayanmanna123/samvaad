import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const uploadToCloudinary = async (fileSource, folder = 'samvad') => {
  // Check if keys are placeholders
  if (process.env.CLOUDINARY_API_KEY === 'your_api_key' || !process.env.CLOUDINARY_API_KEY) {
    console.warn('⚠️ Cloudinary is not configured. File upload skipped.');
    const mockUrl = fileSource instanceof Buffer ? "https://res.cloudinary.com/mock/image/upload/v1/mock.png" : fileSource;
    return { 
      secure_url: mockUrl,
      url: mockUrl,
      resource_type: 'image'
    };
  }

  return new Promise((resolve, reject) => {
    // If it's a base64 string, use .upload
    if (typeof fileSource === 'string' && fileSource.startsWith('data:image')) {
      cloudinary.uploader.upload(fileSource, { folder }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    } else {
      // If it's a buffer, use .upload_stream
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(fileSource);
    }
  });
};

export default cloudinary;