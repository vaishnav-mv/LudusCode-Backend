import 'reflect-metadata'
import './di/container' // Must be imported before app
import app from './app'
import { container } from 'tsyringe'
import { StudySessionService } from './services/studySessionService'
import { CronService } from './services/cronService'
import { env } from './config/env'
import mongoose from 'mongoose'
import http from 'http'
import { initRealtime } from './realtime/ws'
import logger from './utils/logger'

async function bootstrap() {
  try {
    await mongoose.connect(env.MONGODB_URI)
    logger.info('Connected to MongoDB');
    logger.info(`Starting server on port: ${env.PORT}`);
    const server = http.createServer(app)
    initRealtime(server)
    server.on('error', (err) => {
      logger.error('Server error:', err);
      process.exit(1);
    });
    server.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`);
    })

    // Start Daily Subscription Expiry/Renew Cron
    const cronService = container.resolve(CronService);
    cronService.startDailyCron();

    // Start Round Robin Timer Loop
    setInterval(async () => {
      try {
        const service = container.resolve(StudySessionService);
        await service.checkRoundRobinTimers();
      } catch (e) {
        logger.error('Timer Helper Error:', e);
      }
    }, 5000);
  } catch (e) {
    logger.error('Failed to start server:', e);
    process.exit(1)
  }
}

bootstrap()
export default app
