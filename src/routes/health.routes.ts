import { Router } from 'express'
import mongoose from 'mongoose'
import Redis from 'ioredis'
import { env } from '../config/env'
export class HealthRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/', async (req, res) => {
            const db = mongoose.connection.readyState === 1;
            let redis = false;
            try {
                if (env.REDIS_URL) {
                    const client = new Redis(env.REDIS_URL);
                    await client.ping();
                    await client.quit();
                    redis = true
                }
            } catch {
                redis = false
            }
            res.json({ ok: true, db, redis })
        })
    }
}

