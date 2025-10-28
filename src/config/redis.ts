import { createClient } from 'redis';
import config from './index';
import logger from '../utils/logger';

const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

export default redisClient;
