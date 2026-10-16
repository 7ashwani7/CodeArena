import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing with credentials for HTTP-only cookies
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept']
  })
);

// Structured request logging
app.use(requestLogger);

// Strict body size limits (100kb) to safeguard against Denial of Service
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parsing with optional signing secret
app.use(cookieParser(env.COOKIE_SECRET));

// Anti-CSRF protection for state-modifying requests
app.use(csrfProtection);

// Root API Router
app.use('/api', apiRoutes);


// Fallback 404 handler for undefined endpoints
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
