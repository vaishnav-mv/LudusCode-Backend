import { singleton } from 'tsyringe'
import Redis from 'ioredis'
import { env } from '../config/env'
import { IOtpProvider } from '../interfaces/providers'
import logger from '../utils/logger'

let redis: Redis | null = null
const mem: Record<string, { code: string, expiresAt: number }> = {}

@singleton()
export class OtpProvider implements IOtpProvider {
    private ensure() {
        if (!redis && env.REDIS_URL) {
            try {
                redis = new Redis(env.REDIS_URL)
                redis.on('error', (err) => logger.error('Redis Client Error', err));
            } catch (e) {
                logger.error('Failed to initialize Redis', e)
                redis = null
            }
        }
    }

    async create(email: string, purpose: string) {
        this.ensure()
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        logger.debug(`[OTP] Generated for ${email} (${purpose}): ${code}`)
        const key = `otp:${purpose}:${email.toLowerCase()}`

        if (redis) {
            try {
                await redis.set(key, code, 'EX', 60)
                return code
            } catch (e) {
                logger.error('Redis set error, falling back to memory', e)
            }
        }

        mem[key] = { code, expiresAt: Date.now() + 60000 }
        return code
    }

    async verify(email: string, code: string, purpose: string) {
        this.ensure()
        const key = `otp:${purpose}:${email.toLowerCase()}`
        logger.debug(`[OTP] Verifying for ${key}. Input: ${code}`)

        if (redis) {
            try {
                const stored = await redis.get(key)
                logger.debug(`[OTP] Redis stored value: ${stored}`)
                if (!stored) {
                    logger.debug('[OTP] Verification failed: No OTP found in Redis')
                    return false
                }
                if (stored !== code) {
                    logger.debug(`[OTP] Verification failed: Mismatch (Stored: ${stored} !== Input: ${code})`)
                    return false
                }
                await redis.del(key)
                logger.debug('[OTP] Verification success (Redis)')
                return true
            } catch (e) {
                logger.error('Redis get/del error, falling back to memory check', e)
            }
        }

        const rec = mem[key]
        if (!rec) {
            logger.debug('[OTP] Verification failed: No OTP found in Memory')
            return false
        }
        if (Date.now() > rec.expiresAt) {
            logger.debug('[OTP] Verification failed: Memory OTP expired')
            return false
        }
        const ok = rec.code === code
        if (ok) {
            delete mem[key]
            logger.debug('[OTP] Verification success (Memory)')
        } else {
            logger.debug(`[OTP] Verification failed: Mismatch (Stored: ${rec.code} !== Input: ${code})`)
        }
        return ok
    }
}
