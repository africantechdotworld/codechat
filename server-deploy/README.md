# XChat WebSocket Server

This is the WebSocket server component for the XChat application.

## Prerequisites

- Node.js >= 14.0.0
- npm or yarn
- PM2 (for production deployment)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install PM2 globally (for production):
```bash
npm install -g pm2
```

## Development

Run the server in development mode:
```bash
npm run dev
```

## Production Deployment

1. Start the server using PM2:
```bash
pm2 start server.js --name "xchat-websocket"
```

2. Other useful PM2 commands:
```bash
# View logs
pm2 logs xchat-websocket

# Monitor the process
pm2 monit

# Stop the server
pm2 stop xchat-websocket

# Restart the server
pm2 restart xchat-websocket
```

## Environment Variables

- `PORT`: The port to run the server on (default: 10000)
- `NODE_ENV`: Set to 'production' in production environment

## Nginx Configuration (Optional)

If you're using Nginx as a reverse proxy, add this configuration:

```nginx
location /ws {
    proxy_pass http://localhost:10000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Security Considerations

1. In production, update the CORS configuration in `server.js` to only allow your Vercel domain:
```javascript
app.use(cors({
    origin: 'https://your-vercel-domain.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
}));
```

2. Consider setting up SSL/TLS for secure WebSocket connections (wss://) 