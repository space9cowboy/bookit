import express, { type RequestHandler } from 'express';
import { config } from './config';
import { errorHandler, notFoundHandler } from './errors';
import { authRouter } from './routes/auth';
import { bookingsRouter } from './routes/bookings';
import { healthRouter } from './routes/health';
import { meRouter } from './routes/me';
import { roomsRouter } from './routes/rooms';
import { testRouter } from './routes/test';

const requestLogger: RequestHandler = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
};

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(healthRouter);
  api.use('/auth', authRouter);
  api.use(meRouter);
  api.use('/rooms', roomsRouter);
  api.use('/bookings', bookingsRouter);
  if (config.nodeEnv === 'test') {
    api.use('/test', testRouter);
  }

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
