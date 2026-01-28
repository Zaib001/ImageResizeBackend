require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const imageRoutes = require('./routes/image.routes');
const adminRoutes = require('./routes/admin.routes');
const blogRoutes = require('./routes/blog.routes');
const networkRoutes = require('./routes/network.routes');
const connectDB = require('./config/database');

const app = express();

connectDB();

app.use(helmet({
    crossOriginResourcePolicy: false,
}));

const allowedOrigins = [
    'https://image-resize-navy.vercel.app',
    'https://imageresize-1-ikct.onrender.com',
    "https://image-resize-eta.vercel.app",
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Traffic limit exceeded. Please wait 15 minutes.' }
});

app.use('/api', limiter, imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/network', networkRoutes);

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Resizely Engine',
        version: '4.3.0'
    });
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Engine Processing Error';

    if (process.env.NODE_ENV !== 'production') {
        console.error(`[Error ${status}]: ${message}`);
    }

    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === 'production' ? err.message : err.stack,
        code: err.code || 'INTERNAL_ERROR'
    });
});

module.exports = app;
