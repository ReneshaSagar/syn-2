import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import analysisRouter from './routes/analysis';
import chatRouter from './routes/chat';
import assetsRouter from './routes/assets';
import pivotRouter from './routes/pivot';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({ origin: '*' })); // Enable CORS for all origins (perfect for React frontends)
app.use(express.json({ limit: '10mb' })); // support large payloads if inputs are large

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routes directly to root / as requested, and also under /api for flexibility
app.use('/', analysisRouter);
app.use('/', chatRouter);
app.use('/', assetsRouter);
app.use('/', pivotRouter);
app.use('/api', analysisRouter);
app.use('/api', chatRouter);
app.use('/api', assetsRouter);
app.use('/api', pivotRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Synthetic Audience API',
    databaseConnection: process.env.SUPABASE_URL ? 'configured' : 'in-memory-fallback',
    geminiStatus: process.env.GEMINI_API_KEY ? 'configured' : 'mock-fallback'
  });
});

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Synthetic Audience Server running on http://localhost:${PORT}`);
  console.log(`📡 Health Check available at http://localhost:${PORT}/health`);
  console.log(`📁 In-Memory DB state enabled: ${!process.env.SUPABASE_URL ? 'YES' : 'NO'}`);
  console.log(`🧠 Gemini Mock State enabled: ${!process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
});
