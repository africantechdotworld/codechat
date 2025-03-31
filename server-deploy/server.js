// server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGIN || 'https://codechat-neon-two.vercel.app'
        : '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create WebSocket server with compression
const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
    }
});

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    clients.add(ws);
    console.log(`[${new Date().toISOString()}] New client connected from: ${clientIP}`);
    console.log(`Active connections: ${clients.size}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        content: 'Connected to WebSocket server',
        timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Broadcast message to all connected clients except sender
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        ...data,
                        timestamp: new Date().toISOString()
                    }));
                }
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error processing message from ${clientIP}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                content: 'Invalid message format',
                timestamp: new Date().toISOString()
            }));
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[${new Date().toISOString()}] Client disconnected: ${clientIP}`);
        console.log(`Active connections: ${clients.size}`);
    });

    ws.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] WebSocket error for ${clientIP}:`, error);
        clients.delete(ws);
    });
});

// Error handling for the HTTP server
server.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Server error:`, error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received. Closing server...`);
    wss.close(() => {
        console.log('WebSocket server closed');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] WebSocket server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 