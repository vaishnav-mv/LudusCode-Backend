import { singleton } from 'tsyringe'
import Redis from 'ioredis'
import { env } from '../config/env'
import { IOtpProvider } from '../interfaces/providers'

let redis: Redis | null = null
const mem: Record<string, { code: string, expiresAt: number }> = {}

@singleton()
export class OtpProvider implements IOtpProvider {
    private ensure() {
        if (!redis && env.REDIS_URL) {
            try {
                redis = new Redis(env.REDIS_URL)
                redis.on('error', (err) => console.error('Redis Client Error', err));
            } catch (e) {
                console.error('Failed to initialize Redis', e)
                redis = null
            }
        }
    }

    async create(email: string, purpose: string) {
        this.ensure()
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        // Log removed
        const key = `otp:${purpose}:${email.toLowerCase()}`

        if (redis) {
            try {
                await redis.set(key, code, 'EX', 60)
                return code
            } catch (e) {
                console.error('Redis set error, falling back to memory', e)
            }
        }

        mem[key] = { code, expiresAt: Date.now() + 60000 }
        return code
    }

    async verify(email: string, code: string, purpose: string) {
        this.ensure()
        const key = `otp:${purpose}:${email.toLowerCase()}`
        // Log removed

        if (redis) {
            try {
                const stored = await redis.get(key)
                // Log removed
                if (!stored) {
                    return false
                }
                if (stored !== code) {
                    return false
                }
                await redis.del(key)
                return true
            } catch (e) {
                console.error('Redis get/del error, falling back to memory check', e)
            }
        }

        const rec = mem[key]
        if (!rec) {
            return false
        }
        if (Date.now() > rec.expiresAt) {
            return false
        }
        const ok = rec.code === code
        if (ok) {
            delete mem[key]
        }
        return ok
    }
}
