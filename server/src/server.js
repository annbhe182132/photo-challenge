import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import cardRoutes from './routes/cardRoutes.js';
import themeRoutes from './routes/themeRoutes.js';
import punishmentRoutes from './routes/punishmentRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Kết nối MongoDB
connectDB();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/cards', cardRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/punishments', punishmentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/ai', aiRoutes);

// Root & Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Photo Challenge Backend Service',
    timestamp: new Date().toISOString(),
    database: 'MongoDB Ready',
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Photo Challenge Server API is running!</h1><p>Visit /api/health for system status.</p>');
});

app.listen(PORT, () => {
  console.log(`\n🚀 [Server] Photo Challenge API Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`👉 [Health Check]: http://localhost:${PORT}/api/health\n`);
});
