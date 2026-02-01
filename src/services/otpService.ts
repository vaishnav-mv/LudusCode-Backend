import { singleton } from 'tsyringe'
import Redis from 'ioredis'
import { env } from '../config/env'
import { IOtpService } from '../interfaces/services'

let redis: Redis | null = null
const mem: Record<string, { code: string, expiresAt: number }> = {}

@singleton()
export class OtpService implements IOtpService {
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
    console.log(`[OTP] Generated for ${email} (${purpose}): ${code}`)
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
    console.log(`[OTP] Verifying for ${key}. Input: ${code}`)

    if (redis) {
      try {
        const stored = await redis.get(key)
        console.log(`[OTP] Redis stored value: ${stored}`)
        if (!stored) {
          console.log('[OTP] Verification failed: No OTP found in Redis')
          return false
        }
        if (stored !== code) {
          console.log(`[OTP] Verification failed: Mismatch (Stored: ${stored} !== Input: ${code})`)
          return false
        }
        await redis.del(key)
        console.log('[OTP] Verification success (Redis)')
        return true
      } catch (e) {
        console.error('Redis get/del error, falling back to memory check', e)
      }
    }

    const rec = mem[key]
    if (!rec) {
      console.log('[OTP] Verification failed: No OTP found in Memory')
      return false
    }
    if (Date.now() > rec.expiresAt) {
      console.log('[OTP] Verification failed: Memory OTP expired')
      return false
    }
    const ok = rec.code === code
    if (ok) {
      delete mem[key]
      console.log('[OTP] Verification success (Memory)')
    } else {
      console.log(`[OTP] Verification failed: Mismatch (Stored: ${rec.code} !== Input: ${code})`)
    }
    return ok
  }
}
