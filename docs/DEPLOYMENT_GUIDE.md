# 🚀 Deployment Guide
**American Mahjong Assistant - Production Deployment**

This guide provides step-by-step instructions for deploying the American Mahjong Assistant to production environments.

---

## 📋 Prerequisites

### **System Requirements**
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 9+ (comes with Node.js)
- **Git**: Latest version for source control
- **Web Server**: Nginx, Apache, or CDN service
- **SSL Certificate**: Required for HTTPS (production security)

### **Development Environment Setup**
```bash
# Clone repository
git clone <repository-url>
cd american-mahjong-assistant

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Verify builds work
cd backend && npm run build
cd ../frontend && npm run build
```

---

## 🏗️ Build Configuration

### **Frontend Production Build**
The frontend uses **Vite** with optimized production configuration:

**Location**: `frontend/vite.config.ts`

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Optimized chunking strategy
          if (id.includes('node_modules/react')) return 'vendor-react'
          if (id.includes('node_modules/@headlessui')) return 'vendor-ui'
          if (id.includes('node_modules/zustand')) return 'vendor-state'
          if (id.includes('node_modules')) return 'vendor-other'
          if (id.includes('services/')) return 'services'
          if (id.includes('intelligence/')) return 'intelligence'
          return undefined
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

**Build Commands**:
```bash
cd frontend
npm run build          # Production build
npm run preview        # Test production build locally
```

### **Backend Production Build**
The backend uses **TypeScript** compilation:

**Location**: `backend/tsconfig.json`

```bash
cd backend
npm run build          # Compile TypeScript
npm start             # Run compiled JavaScript
```

---

## 🌍 Environment Configuration

### **Frontend Environment Variables**
**File**: `frontend/.env.production`

```env
# Production backend URL
VITE_BACKEND_URL=https://your-backend-domain.com

# Feature flags
VITE_ENABLE_MULTIPLAYER=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_DEBUG_MODE=false

# Monitoring
VITE_ERROR_TRACKER_DSN=your-error-tracking-dsn
VITE_ANALYTICS_ID=your-analytics-id

# Performance
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_PERFORMANCE_SAMPLE_RATE=0.1
```

### **Backend Environment Variables**
**File**: `backend/.env.production`

```env
# Server configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# CORS settings
CORS_ORIGIN=https://your-frontend-domain.com

# Socket.io configuration
SOCKET_IO_ORIGINS=https://your-frontend-domain.com:*

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Monitoring
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=info
```

---

## 🔧 Web Server Configuration

### **Nginx Configuration**
**File**: `/etc/nginx/sites-available/mahjong-assistant`

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/your-certificate.crt;
    ssl_certificate_key /path/to/your-private-key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Frontend (static files)
    location / {
        root /var/www/mahjong-assistant/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API and Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### **Apache Configuration** (Alternative)
**File**: `/etc/apache2/sites-available/mahjong-assistant.conf`

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /var/www/mahjong-assistant/frontend/dist
    
    SSLEngine on
    SSLCertificateFile /path/to/your-certificate.crt
    SSLCertificateKeyFile /path/to/your-private-key.key
    
    # Frontend routing
    <Directory "/var/www/mahjong-assistant/frontend/dist">
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>
    
    # Backend proxy
    ProxyPreserveHost On
    ProxyPass /socket.io/ http://localhost:5000/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:5000/socket.io/
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5000/$1" [P,L]
</VirtualHost>
```

---

## 🐳 Docker Deployment

### **Multi-Stage Dockerfile**
**File**: `Dockerfile`

```dockerfile
# Frontend build stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# Backend build stage
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built applications
COPY --from=backend-build /app/backend/dist ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

CMD ["node", "backend/server.js"]
```

### **Docker Compose**
**File**: `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  mahjong-assistant:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CORS_ORIGIN=https://your-domain.com
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
      - ./logs:/var/log/nginx
    depends_on:
      - mahjong-assistant
    restart: unless-stopped
```

---

## ☁️ Cloud Deployment Options

### **Vercel (Recommended for Frontend)**
**Configuration**: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/node",
      "config": { "outputDirectory": "frontend/dist" }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "VITE_BACKEND_URL": "https://your-backend.herokuapp.com"
  }
}
```

**Deployment Commands**:
```bash
npm install -g vercel
vercel --prod
```

### **Heroku (Backend Deployment)**
**Configuration**: `Procfile`

```
web: cd backend && npm start
```

**Package.json** (add to backend):
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "heroku-postbuild": "npm run build"
  }
}
```

### **DigitalOcean App Platform**
**Configuration**: `.do/app.yaml`

```yaml
name: mahjong-assistant

services:
- name: backend
  source_dir: backend
  github:
    repo: your-username/american-mahjong-assistant
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: frontend
  source_dir: frontend
  github:
    repo: your-username/american-mahjong-assistant
    branch: main
  run_command: npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
```

---

## 🔍 Monitoring & Health Checks

### **Health Check Endpoints**
**Backend**: `backend/src/routes/health.ts`

```typescript
import { Router } from 'express'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

router.get('/ready', (req, res) => {
  // Check database connections, external services, etc.
  const checks = {
    server: 'ok',
    memory: process.memoryUsage().heapUsed < 512 * 1024 * 1024 // 512MB
  }
  
  const allHealthy = Object.values(checks).every(status => status === 'ok')
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks
  })
})

export default router
```

### **Log Monitoring**
**Backend Logging**: Use structured logging

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})
```

---

## 🔒 Security Configuration

### **Content Security Policy**
**Frontend**: `index.html` meta tag

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' wss: https:;
  font-src 'self';
">
```

### **Backend Security Headers**
```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))
```

### **Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', limiter)
```

---

## 🚀 Deployment Checklist

### **Pre-Deployment**
- [ ] **Run all tests**: `npm test` in both frontend and backend
- [ ] **Build successfully**: `npm run build` with no errors
- [ ] **Environment variables configured**: Production .env files ready
- [ ] **SSL certificates obtained**: HTTPS ready for production
- [ ] **Domain DNS configured**: Pointing to server/CDN
- [ ] **Monitoring setup**: Error tracking and analytics configured

### **Deployment Steps**
1. [ ] **Build applications**: Generate production builds
2. [ ] **Upload files**: Transfer builds to server or deploy to platform
3. [ ] **Configure web server**: Nginx/Apache with proper routing
4. [ ] **Start services**: Backend server and process management
5. [ ] **Verify health checks**: All endpoints responding correctly
6. [ ] **Test critical features**: Pattern selection, tile input, AI analysis

### **Post-Deployment**
- [ ] **Monitor logs**: Check for errors or performance issues
- [ ] **Performance testing**: Verify load times and responsiveness
- [ ] **Cross-device testing**: Mobile, tablet, desktop compatibility
- [ ] **User acceptance testing**: Real users testing key workflows
- [ ] **Backup strategy**: Data backup and recovery procedures
- [ ] **Update documentation**: Deployment notes and runbooks

---

## 📊 Performance Monitoring

### **Key Metrics to Track**
- **Load Time**: Target <3 seconds on 3G
- **Bundle Size**: Target <500KB initial load
- **Memory Usage**: Monitor for memory leaks
- **Error Rates**: Keep under 1% for critical paths
- **User Engagement**: Pattern selection and game completion rates

### **Monitoring Tools**
- **Error Tracking**: Sentry, Rollbar, or Bugsnag
- **Performance**: Google Analytics, Lighthouse CI
- **Uptime**: UptimeRobot, Pingdom
- **Server Monitoring**: New Relic, DataDog, or native cloud monitoring

---

## 🔄 Continuous Deployment

### **GitHub Actions Workflow**
**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install and Test Frontend
      run: |
        cd frontend
        npm ci
        npm run lint
        npm run build
        npm run test:ci
    - name: Install and Test Backend
      run: |
        cd backend
        npm ci
        npm run build
        npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Production
      # Add your deployment steps here
      run: echo "Deploy to production server"
```

---

## 🆘 Troubleshooting Deployment

### **Common Issues**
1. **Build Failures**: Check Node.js version compatibility
2. **CORS Errors**: Verify frontend/backend URL configuration
3. **Socket.io Connection**: Check WebSocket proxy configuration
4. **Performance Issues**: Review bundle size and chunking strategy
5. **SSL Problems**: Verify certificate installation and renewal

### **Debugging Commands**
```bash
# Check build output
npm run build 2>&1 | tee build.log

# Test production build locally
npm run preview

# Check server health
curl https://your-domain.com/api/health

# Monitor server logs
tail -f logs/combined.log
```

The American Mahjong Assistant is now ready for production deployment with enterprise-grade configuration and monitoring! 🚀