import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'
import { ResponseMessages } from '../constants'
import { singleton } from 'tsyringe'
import { ICloudinaryProvider } from '../interfaces/providers'
import logger from '../utils/logger'

@singleton()
export class CloudinaryProvider implements ICloudinaryProvider {
    constructor() {
        cloudinary.config({
            cloud_name: env.CLOUDINARY_CLOUD_NAME,
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET
        })
    }

    async uploadImage(filePath: string, folder: string = 'avatars'): Promise<string> {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: `luduscode/${folder}`,
                resource_type: 'image'
            })
            return result.secure_url
        } catch (error) {
            logger.error('Cloudinary upload error:', error)
            throw new Error(ResponseMessages.FAILED_UPLOAD)
        }
    }
}
