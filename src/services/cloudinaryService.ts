import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'
import { ResponseMessages } from '../constants'

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
})

import { singleton } from 'tsyringe'
@singleton()
export class CloudinaryService {
    async uploadImage(filePath: string, folder: string = 'avatars'): Promise<string> {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: `luduscode/${folder}`,
                resource_type: 'image'
            })
            return result.secure_url
        } catch (error) {
            console.error('Cloudinary upload error:', error)
            throw new Error(ResponseMessages.FAILED_UPLOAD)
        }
    }
}
