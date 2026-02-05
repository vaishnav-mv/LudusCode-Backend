import dotenv from 'dotenv'
dotenv.config()
export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/luduscode',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || 'localhost',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true'
  , GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || ''
  , GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
  , GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || ''
  , GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || ''
  , GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || ''
  , GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || ''
  , GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || ''
  , FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
  , CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || ''
  , CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || ''
  , CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  , RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || ''
  , RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || ''
}
