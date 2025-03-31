// server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: '*', // In production, replace with your Vercel domain
    methods: ['GET', 'POST'],
    credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    path: '/ws', // Add a specific path for WebSocket connections
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

wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log('New client connected from:', req.socket.remoteAddress);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Broadcast message to all connected clients except sender
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WebSocket server running on port ${PORT}`);
});