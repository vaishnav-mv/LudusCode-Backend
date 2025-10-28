"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const logger_1 = __importDefault(require("../utils/logger"));
const CACHE_EXPIRATION_SECONDS = 300; // 5 minutes
/**
 * Middleware to cache responses for GET requests using Redis.
 *
 * @param req - The Express Request object.
 * @param res - The Express Response object.
 * @param next - The Express NextFunction.
 */
const cacheMiddleware = async (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }
    const key = `__express__${req.originalUrl}` || `__express__${req.url}`;
    try {
        const cachedData = await redis_1.default.get(key);
        if (cachedData) {
            logger_1.default.info(`Cache hit for key: ${key}`);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.parse(cachedData));
            return;
        }
        // If not cached, proceed to the route handler and cache its response
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logger_1.default.info(`Cache miss for key: ${key}. Caching response.`);
                redis_1.default.setEx(key, CACHE_EXPIRATION_SECONDS, typeof body === 'string' ? body : JSON.stringify(body));
            }
            return originalSend(body);
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Redis cache error:', error);
        next(); // Proceed without caching if Redis fails
    }
};
exports.cacheMiddleware = cacheMiddleware;
