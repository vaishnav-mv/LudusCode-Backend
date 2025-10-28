import nodemailer from 'nodemailer';
import config from './index';
import logger from '../utils/logger';

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  secure: config.emailSecure, // true for 465, false for other ports
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error('Email service error:', error);
  } else {
    logger.info('Email service is ready to send messages');
  }
});

export default transporter;