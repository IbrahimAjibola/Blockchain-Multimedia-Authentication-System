# Complete Deployment Guide for Multimedia Authentication System

This comprehensive guide covers deployment of all components: Frontend (Vercel), Backend (AWS/GCP/Render), Smart Contracts (Ethereum), and Infrastructure setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Smart Contract Deployment](#smart-contract-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [DNS and SSL Setup](#dns-and-ssl-setup)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Accounts and Services

#### 1. Blockchain Infrastructure
- [ ] **Infura Account** (Ethereum RPC)
- [ ] **Etherscan API Key** (Contract verification)
- [ ] **MetaMask Wallet** (Deployment transactions)
- [ ] **Test ETH** (Sepolia and Mainnet)

#### 2. Cloud Infrastructure
- [ ] **AWS Account** (Backend hosting)
- [ ] **Google Cloud Account** (Alternative backend)
- [ ] **Vercel Account** (Frontend hosting)
- [ ] **Domain Registrar** (DNS management)

#### 3. Development Tools
- [ ] **Node.js 18+** installed
- [ ] **Docker** installed
- [ ] **Git** configured
- [ ] **pnpm** package manager

### Environment Setup

#### 1. Clone Repository
```bash
git clone https://github.com/your-username/multimedia-auth-system.git
cd multimedia-auth-system
```

#### 2. Install Dependencies
```bash
# Install root dependencies
pnpm install

# Install workspace dependencies
pnpm install --recursive
```

#### 3. Environment Variables
Create environment files for each component:

**Frontend (.env)**
```bash
REACT_APP_MULTIMEDIA_NFT_ADDRESS=your-contract-address
REACT_APP_LICENSING_CONTRACT_ADDRESS=your-contract-address
REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
```

**Backend (.env)**
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-mongodb-uri
JWT_SECRET=your-jwt-secret
IPFS_API_URL=https://api.ipfs.io
IPFS_PROJECT_ID=your-ipfs-project-id
IPFS_PROJECT_SECRET=your-ipfs-project-secret
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
MULTIMEDIA_NFT_ADDRESS=your-contract-address
LICENSING_CONTRACT_ADDRESS=your-contract-address
PRIVATE_KEY=your-private-key
CORS_ORIGIN=https://your-domain.com
```

## Smart Contract Deployment

### 1. Sepolia Testnet Deployment

#### Setup Hardhat Configuration
```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
SEPOLIA_PRIVATE_KEY=your-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

#### Deploy to Sepolia
```bash
# Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts
npx hardhat verify --network sepolia CONTRACT_ADDRESS "constructor" "arguments"
```

#### Expected Output
```
🚀 Deploying contracts to Sepolia...
📦 MultimediaNFT deployed to: 0x...
📦 LicensingContract deployed to: 0x...
📦 MultimediaRegistry deployed to: 0x...
✅ All contracts deployed successfully!
```

### 2. Mainnet Deployment

#### Prerequisites
- [ ] Sufficient ETH balance (>0.1 ETH)
- [ ] Gas price optimization
- [ ] Contract audit completion

#### Deploy to Mainnet
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-mainnet.js --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet CONTRACT_ADDRESS "constructor" "arguments"
```

#### Security Checklist
- [ ] Contract addresses verified
- [ ] Constructor parameters correct
- [ ] Gas optimization applied
- [ ] Emergency functions tested
- [ ] Access control verified

## Backend Deployment

### Option 1: AWS Deployment (Recommended)

#### 1. AWS CDK Setup
```bash
cd deployment
npm install -g aws-cdk
cdk bootstrap
```

#### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (us-east-1)
```

#### 3. Deploy Infrastructure
```bash
# Deploy the stack
cdk deploy

# Monitor deployment
aws cloudformation describe-stacks --stack-name MultimediaAuthStack
```

#### 4. Build and Push Docker Image
```bash
# Build image
docker build -t multimedia-auth-backend .

# Tag for ECR
docker tag multimedia-auth-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/multimedia-auth-backend:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/multimedia-auth-backend:latest
```

### Option 2: Google Cloud Deployment

#### 1. Terraform Setup
```bash
cd deployment
terraform init
terraform plan
terraform apply
```

#### 2. Build and Deploy
```bash
# Build container
docker build -t gcr.io/YOUR_PROJECT_ID/multimedia-auth-backend .

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/multimedia-auth-backend:latest

# Deploy to Cloud Run
gcloud run deploy multimedia-auth-backend \
  --image gcr.io/YOUR_PROJECT_ID/multimedia-auth-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 3: Render Deployment

#### 1. Connect GitHub Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository

#### 2. Configure Service
```yaml
# render.yaml
services:
  - type: web
    name: multimedia-auth-backend
    env: node
    buildCommand: cd backend && pnpm install
    startCommand: cd backend && pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
```

#### 3. Set Environment Variables
In Render dashboard:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Your JWT secret
- `IPFS_API_URL`: IPFS API URL
- `ETHEREUM_RPC_URL`: Ethereum RPC URL
- `MULTIMEDIA_NFT_ADDRESS`: Contract address
- `LICENSING_CONTRACT_ADDRESS`: Contract address

## Frontend Deployment

### Vercel Deployment

#### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository

#### 2. Configure Build Settings
```json
// vercel.json
{
  "buildCommand": "cd frontend && pnpm install && pnpm build",
  "outputDirectory": "frontend/dist",
  "installCommand": "pnpm install"
}
```

#### 3. Set Environment Variables
In Vercel dashboard:
- `REACT_APP_MULTIMEDIA_NFT_ADDRESS`: Contract address
- `REACT_APP_LICENSING_CONTRACT_ADDRESS`: Contract address
- `REACT_APP_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID
- `REACT_APP_CHAIN_ID`: 11155111 (Sepolia) or 1 (Mainnet)
- `REACT_APP_RPC_URL`: Infura RPC URL

#### 4. Deploy
```bash
# Deploy to Vercel
vercel --prod

# Or use GitHub integration for automatic deployments
```

### Custom Domain Setup
1. Add custom domain in Vercel dashboard
2. Configure DNS records
3. Enable SSL certificate

## DNS and SSL Setup

### 1. Domain Configuration

#### A Records
```
Type: A
Name: @
Value: [Your Load Balancer IP]
TTL: 300

Type: A
Name: www
Value: [Your Load Balancer IP]
TTL: 300

Type: A
Name: api
Value: [Your Backend IP]
TTL: 300
```

#### CNAME Records
```
Type: CNAME
Name: ipfs
Value: cloudflare-ipfs.com
TTL: 300
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Cloudflare (Recommended)
1. Enable Cloudflare for your domain
2. Set SSL/TLS mode to "Full (strict)"
3. Enable HSTS
4. Configure security headers

### 3. Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Maintenance

### 1. Health Monitoring

#### Set Up Monitoring
```bash
# UptimeRobot
- Main site: https://your-domain.com
- API health: https://api.your-domain.com/health
- IPFS gateway: https://ipfs.your-domain.com

# SSL Labs
- Test SSL: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

#### Health Check Endpoints
```javascript
// Backend health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### 2. Logging and Analytics

#### Application Logs
```javascript
// Winston logging configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Performance Monitoring
```javascript
// Performance metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});
```

### 3. Backup and Recovery

#### Database Backup
```bash
# MongoDB backup
mongodump --uri="mongodb://your-connection-string" --out=/backup/$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backup/$DATE"
aws s3 sync /backup s3://your-backup-bucket
```

#### Configuration Backup
```bash
# Backup environment files
cp .env .env.backup.$(date +%Y%m%d)

# Backup SSL certificates
sudo cp -r /etc/letsencrypt/live/your-domain.com/ /backup/ssl/
```

### 4. Security Maintenance

#### Regular Security Tasks
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Monitor failed login attempts
- [ ] Check SSL certificate expiration
- [ ] Review security headers quarterly

#### Security Headers
```nginx
# Comprehensive security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://sepolia.infura.io https://ipfs.io;" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates obtained
- [ ] DNS records configured
- [ ] Monitoring tools set up

### Deployment
- [ ] Smart contracts deployed and verified
- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] SSL certificates installed
- [ ] DNS propagation complete
- [ ] Health checks passing

### Post-Deployment
- [ ] End-to-end testing completed
- [ ] Performance monitoring active
- [ ] Backup procedures tested
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team notified of deployment

## Troubleshooting

### Common Issues

#### 1. Contract Deployment Failed
```bash
# Check gas price
npx hardhat run scripts/deploy.js --network sepolia --gas-price 20000000000

# Check balance
npx hardhat run scripts/check-balance.js --network sepolia
```

#### 2. Backend Deployment Issues
```bash
# Check logs
docker logs multimedia-auth-backend

# Check health
curl https://api.your-domain.com/health

# Check environment variables
docker exec multimedia-auth-backend env
```

#### 3. Frontend Build Issues
```bash
# Clear cache
rm -rf frontend/node_modules frontend/.cache
pnpm install

# Check build locally
cd frontend && pnpm build
```

#### 4. DNS Issues
```bash
# Check DNS propagation
dig your-domain.com A
nslookup your-domain.com

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

This comprehensive deployment guide ensures successful deployment of all components with proper monitoring, security, and maintenance procedures. 