// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const imageRoutes = require('./routes/image.routes');

const app = express();

// Increase payload limit for large images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS Configuration - SIMPLE for now
app.use(cors({
    origin: ['https://image-resize-navy.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

// Add CORS headers manually for all responses
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['https://image-resize-navy.vercel.app', 'http://localhost:5173'];

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

// Rate Limiting (more generous for image processing)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// Routes
app.use('/api', imageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Image Resize API'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Image Resize API',
        version: '1.0.0',
        endpoints: {
            process: 'POST /api/process',
            health: 'GET /health'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);

    // Set CORS headers even on errors
    const origin = req.headers.origin;
    const allowedOrigins = ['https://image-resize-navy.vercel.app', 'http://localhost:5173'];

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        error: message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

module.exports = app;