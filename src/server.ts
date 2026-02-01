import 'reflect-metadata'
import './di/container' // Must be imported before app
import app from './app'
import { env } from './config/env'
import mongoose from 'mongoose'
import http from 'http'
import { initRealtime } from './realtime/ws'

async function bootstrap() {
  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log('Connected to MongoDB');
    console.log('Starting server on port:', env.PORT);
    const server = http.createServer(app)
    initRealtime(server)
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
    server.listen(env.PORT, () => {
      console.log(`Server listening on port ${env.PORT}`);
    })
    // Start Round Robin Timer Loop
    setInterval(async () => {
      try {
        const { container } = require('tsyringe');
        const { StudySessionService } = require('./services/studySessionService');
        const service = container.resolve(StudySessionService);
        await service.checkRoundRobinTimers();
      } catch (e) {
        console.error('Timer Helper Error:', e);
      }
    }, 5000);
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1)
  }
}

bootstrap()
export default app
