import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { env, corsOrigins } from './env.js';
import { logger } from './logger.js';
import { HttpError } from './http/errors.js';
import { apiRouter } from './routes/index.js';
import { setupSignaling } from './signaling.js';

const app = express();
const server = http.createServer(app);

// Use Morgan for HTTP request logging, pipelining to Winston
app.use(morgan(
  ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }
));
app.use(helmet());
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiRouter);

// Global Error Handler for API failures
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next; // Express error handler requires 4 arguments
  
  const errorContext = {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    ip: req.ip
  };

  if (err instanceof HttpError) {
    logger.warn(`API Error: ${err.message}`, { ...errorContext, status: err.status, code: err.code });
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  
  if (err instanceof Error) {
    logger.error(`API Failure: ${err.message}`, { ...errorContext, stack: err.stack });
  } else {
    logger.error('Unhandled API error', { err, ...errorContext });
  }
  
  res.status(500).json({ error: 'Internal Server Error' });
});

setupSignaling(server);

server.listen(env.PORT, () => {
  logger.info(`API and Signaling Server listening`, { port: env.PORT, env: env.NODE_ENV });
});
