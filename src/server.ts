import mongoose from 'mongoose';
import app from './app';
import config from './config';
import User from './models/User';
import { Role } from './constants';
import logger from './utils/logger';
import redisClient from './config/redis';

const PORT = process.env.PORT || 5000;

const seedAdminUser = async (): Promise<void> => {
  try {
    const adminExists = await User.findOne({ role: Role.Admin });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@ludus.code',
        password: 'adminpassword', 
        role: Role.Admin,
        isVerified: true,
      });
      await admin.save();
      logger.info('Default admin user created.');
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
};

const startServer = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');

    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      // Seed the database with a default admin user
      seedAdminUser();
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
