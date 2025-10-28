import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'reflect-metadata';
import './di'; // Initialize dependency injection container
import config from './config';
import { HttpStatus } from './constants';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import groupRoutes from './routes/group.routes';
import { errorHandler } from './middleware/error.middleware';
import AppError from './utils/AppError';
import logger from './utils/logger';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cookieParser());
// Middleware
app.use(cors({
  origin:process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));


const requestLogger: RequestHandler = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
};
app.use(requestLogger);

// API Routes
app.get('/api', (req: Request, res: Response) => {
  res.status(HttpStatus.OK).json({
    success: true,
    message: 'LudusCode API is running...',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    statusCode: HttpStatus.OK
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);

// Handle 404 errors
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, HttpStatus.NOT_FOUND));
});

// Global error handling middleware
app.use(errorHandler);

export default app;
