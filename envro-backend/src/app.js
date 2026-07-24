import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { setupRoutes } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Trust Proxy (required for rate-limiter behind Render/Heroku) ────────
app.set('trust proxy', 1);

// ─── Security & Middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'connect-src': ["'self'", 'https://api.cloudinary.com', 'https://res.cloudinary.com'],
    },
  },
}));

app.use(
  cors({
    origin: config.env === 'production' ? config.allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────────────
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health Check ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────
app.use('/api/v1', setupRoutes());

// ─── Swagger ────────────────────────────────────────────────────────────
import { setupSwagger } from './config/swagger.js';
setupSwagger(app);

// ─── Static Frontend Bundle ─────────────────────────────────────────────
// In production, the built web app is served from the public/ directory.
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback — unmatched GET routes serve index.html for client-side routing.
// API routes, /health, and swagger are matched by their own handlers above.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── 404 & Error Handler ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
