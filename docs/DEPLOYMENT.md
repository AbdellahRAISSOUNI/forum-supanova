# Deployment Guide

## Overview

This guide covers deploying the Forum des Entreprises application to production environments.

## Prerequisites

- Node.js 18+ installed on the server
- MongoDB Atlas account or MongoDB instance
- Domain name (optional but recommended)
- SSL certificate (recommended for production)

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file with the following variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# NextAuth.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key-here

# Optional: Analytics and Monitoring
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

### 2. Security Considerations

- **NEXTAUTH_SECRET**: Generate a strong, random secret key
- **MONGODB_URI**: Use a dedicated database user with minimal permissions
- **Environment Variables**: Never commit sensitive data to version control

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides seamless deployment for Next.js applications.

#### Steps:

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Navigate to Project Settings
   - Add environment variables in the Environment Variables section

3. **Configure Domain**
   - Add your custom domain in the Domains section
   - Configure DNS settings as instructed

#### Vercel Configuration

Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "NEXTAUTH_URL": "@nextauth-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Option 2: Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - NEXTAUTH_URL=${NEXTAUTH_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Option 3: Traditional Server Deployment

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/forum-supanova.git
cd forum-supanova

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "forum-supanova" -- start
pm2 save
pm2 startup
```

#### 3. Nginx Configuration

Create `/etc/nginx/sites-available/forum-supanova`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/forum-supanova /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Choose appropriate region and tier

2. **Configure Security**
   - Create database user with read/write permissions
   - Configure IP whitelist (0.0.0.0/0 for development, specific IPs for production)
   - Enable network access

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### Local MongoDB

```bash
# Install MongoDB
sudo apt install mongodb -y

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
use forum-ensate
db.createUser({
  user: "forum_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

## SSL/HTTPS Setup

### Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL

1. Sign up for Cloudflare
2. Add your domain
3. Update DNS nameservers
4. Enable SSL/TLS encryption mode
5. Configure SSL settings in Cloudflare dashboard

## Performance Optimization

### 1. Next.js Configuration

Update `next.config.ts` for production:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  experimental: {
    optimizeCss: true,
  },
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

### 2. Database Optimization

```javascript
// Add indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "createdAt": -1 })
```

### 3. Caching

Implement Redis for session caching:

```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Monitoring and Logging

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install --save @sentry/nextjs

# Configure Sentry
# Create sentry.client.config.ts and sentry.server.config.ts
```

### 2. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/forum-supanova

# Add:
/var/log/forum-supanova/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### 3. Health Checks

Create health check endpoint:

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

## Backup Strategy

### 1. Database Backup

```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/db" --out=backup_$DATE
tar -czf backup_$DATE.tar.gz backup_$DATE
rm -rf backup_$DATE
```

### 2. Application Backup

```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d).tar.gz /path/to/forum-supanova
```

### 3. Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup_script.sh
```

## Security Hardening

### 1. Server Security

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### 2. Application Security

```typescript
// Add security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Clear `.next` folder and rebuild
   - Verify all environment variables are set

2. **Database Connection Issues**
   - Verify MongoDB URI format
   - Check network connectivity
   - Ensure database user has correct permissions

3. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches deployment URL
   - Ensure session configuration is correct

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export DEBUG=*
npm run dev
```

### Log Analysis

```bash
# View application logs
pm2 logs forum-supanova

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Check application logs for errors
   - Monitor database performance
   - Review security updates

2. **Monthly**
   - Update dependencies
   - Review and rotate secrets
   - Performance analysis

3. **Quarterly**
   - Security audit
   - Backup restoration test
   - Disaster recovery planning

### Updates

```bash
# Update application
git pull origin main
npm install
npm run build
pm2 restart forum-supanova

# Update dependencies
npm audit
npm update
```

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Contact the development team

## Production Checklist

- [ ] Environment variables configured
- [ ] Database connection established
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Security hardening completed
- [ ] Performance optimization applied
- [ ] Health checks configured
- [ ] Documentation updated
