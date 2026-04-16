import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

/**
 * Upload a file to ImageKit
 * @param {Buffer} fileBuffer - The buffer of the file to upload
 * @param {string} fileName - The name of the file
 * @param {string} folder - The folder to upload to
 * @returns {Promise<Object>} - The upload result
 */
export const uploadToImageKit = async (fileBuffer, fileName, folder = "/samvaad") => {
    try {
        console.log("📤 Attempting ImageKit upload:", fileName, "to", folder);
        const result = await imagekit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true
        });
        console.log("✅ ImageKit upload successful:", result.url);
        return result;
    } catch (error) {
        console.error("❌ ImageKit upload error:", error);
        // Log more details if available
        if (error.help) console.error("💡 Helper:", error.help);
        throw error;
    }
};

export default imagekit;
