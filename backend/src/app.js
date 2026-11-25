import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import adjustmentRoutes from './routes/adjustmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import miscRoutes from './routes/miscRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  app.use('/api/v1', apiLimiter);

  app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, status: 'ok', service: 'vbus-attendance-payroll-api' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/adjustments', adjustmentRoutes);
  app.use('/api/v1/payroll', payrollRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1', miscRoutes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
  });

  app.use(errorHandler);
  return app;
}
