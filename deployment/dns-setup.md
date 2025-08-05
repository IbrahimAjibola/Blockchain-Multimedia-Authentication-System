# DNS Setup Guide for Multimedia Authentication System

This guide provides step-by-step instructions for setting up DNS, SSL certificates, and domain configuration for the multimedia authentication system.

## Table of Contents

1. [Domain Registration](#domain-registration)
2. [DNS Configuration](#dns-configuration)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [IPFS Gateway Configuration](#ipfs-gateway-configuration)
5. [Monitoring and Health Checks](#monitoring-and-health-checks)

## Domain Registration

### 1. Choose a Domain Name

Select a professional domain name for your multimedia authentication system:

**Recommended formats:**
- `multimedia-auth.com`
- `blockchain-auth.com`
- `nft-verify.com`
- `media-provenance.com`

### 2. Register the Domain

**Popular registrars:**
- **Namecheap** (Recommended for privacy)
- **Google Domains**
- **Cloudflare Registrar**
- **GoDaddy**

**Registration checklist:**
- [ ] Choose domain name
- [ ] Enable privacy protection
- [ ] Set up auto-renewal
- [ ] Configure DNS servers

## DNS Configuration

### 1. Basic DNS Records

Create the following DNS records in your domain registrar's DNS management panel:

#### A Records (IPv4)
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

#### AAAA Records (IPv6) - Optional
```
Type: AAAA
Name: @
Value: [Your IPv6 Address]
TTL: 300

Type: AAAA
Name: www
Value: [Your IPv6 Address]
TTL: 300
```

#### CNAME Records
```
Type: CNAME
Name: cdn
Value: [Your CDN Domain]
TTL: 300

Type: CNAME
Name: ipfs
Value: [Your IPFS Gateway]
TTL: 300
```

### 2. Email Configuration (Optional)

#### MX Records
```
Type: MX
Name: @
Value: mail.your-domain.com
Priority: 10
TTL: 300
```

#### TXT Records
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
TTL: 300

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@your-domain.com
TTL: 300
```

### 3. Security Headers

#### TXT Records for Security
```
Type: TXT
Name: _security
Value: include:https://your-domain.com/.well-known/security.txt
TTL: 300
```

## SSL Certificate Setup

### 1. Let's Encrypt (Free)

#### Using Certbot
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Cloudflare (Recommended)
1. **Enable Cloudflare** for your domain
2. **Set SSL/TLS mode** to "Full (strict)"
3. **Enable HSTS** in SSL/TLS settings
4. **Configure security headers**

### 2. Commercial SSL Certificates

#### Wildcard Certificate
```bash
# Generate CSR
openssl req -new -newkey rsa:2048 -keyout your-domain.key -out your-domain.csr

# Install certificate
sudo cp your-domain.crt /etc/ssl/certs/
sudo cp your-domain.key /etc/ssl/private/
```

### 3. SSL Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

## IPFS Gateway Configuration

### 1. Set Up IPFS Gateway

#### Using Cloudflare IPFS Gateway
```
Type: CNAME
Name: ipfs
Value: cloudflare-ipfs.com
TTL: 300
```

#### Using Custom IPFS Gateway
```nginx
location /ipfs/ {
    proxy_pass https://ipfs.io;
    proxy_set_header Host ipfs.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

### 2. IPFS Gateway Providers

**Recommended gateways:**
- **Cloudflare IPFS** (Fast, reliable)
- **IPFS.io** (Official gateway)
- **Pinata Gateway** (Professional service)
- **Infura IPFS** (Enterprise)

### 3. Gateway Configuration

#### Environment Variables
```bash
# Frontend
REACT_APP_IPFS_GATEWAY=https://ipfs.your-domain.com

# Backend
IPFS_GATEWAY_URL=https://ipfs.your-domain.com
IPFS_API_URL=https://api.ipfs.io
```

## Monitoring and Health Checks

### 1. DNS Health Monitoring

#### Using UptimeRobot
1. **Create account** at uptimerobot.com
2. **Add monitors:**
   - Main website: `https://your-domain.com`
   - API endpoint: `https://api.your-domain.com/health`
   - IPFS gateway: `https://ipfs.your-domain.com`

#### Using Pingdom
```bash
# Monitor endpoints
- https://your-domain.com (Main site)
- https://api.your-domain.com/health (API health)
- https://ipfs.your-domain.com (IPFS gateway)
```

### 2. SSL Certificate Monitoring

#### Using SSL Labs
```bash
# Test SSL configuration
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

#### Using Certbot
```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### 3. DNS Propagation Check

#### Using Online Tools
```bash
# Check DNS propagation
- https://www.whatsmydns.net/
- https://dnschecker.org/
- https://toolbox.googleapps.com/apps/dig/
```

#### Using Command Line
```bash
# Check A record
dig your-domain.com A

# Check CNAME
dig www.your-domain.com CNAME

# Check MX record
dig your-domain.com MX
```

## Advanced Configuration

### 1. CDN Setup

#### Cloudflare Configuration
1. **Enable Cloudflare** for your domain
2. **Configure caching rules:**
   ```
   Cache Level: Standard
   Browser Cache TTL: 4 hours
   Always Online: On
   ```

3. **Set up page rules:**
   ```
   URL: api.your-domain.com/*
   Settings: Cache Level: Bypass
   ```

#### AWS CloudFront
```yaml
# CloudFront distribution
DistributionConfig:
  Origins:
    - Id: api-origin
      DomainName: api.your-domain.com
      CustomOriginConfig:
        HTTPPort: 443
        HTTPSPort: 443
        OriginProtocolPolicy: https-only
```

### 2. Load Balancer Configuration

#### Health Check Endpoints
```nginx
# Health check endpoint
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

#### Load Balancer Health Checks
```yaml
HealthCheck:
  Target: HTTP:5000/health
  Interval: 30
  Timeout: 5
  HealthyThreshold: 2
  UnhealthyThreshold: 3
```

### 3. Security Headers

#### Comprehensive Security Headers
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://sepolia.infura.io https://ipfs.io;" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## Troubleshooting

### Common DNS Issues

#### 1. DNS Propagation Delay
```bash
# Check propagation status
dig +short your-domain.com A

# Wait up to 48 hours for full propagation
```

#### 2. SSL Certificate Issues
```bash
# Check certificate validity
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Verify certificate chain
openssl x509 -in certificate.crt -text -noout
```

#### 3. IPFS Gateway Issues
```bash
# Test IPFS gateway
curl -I https://ipfs.your-domain.com/ipfs/QmHash

# Check gateway response
curl -v https://ipfs.your-domain.com/ipfs/QmHash
```

### Performance Optimization

#### 1. DNS Optimization
```bash
# Use multiple DNS providers
Primary: Cloudflare (1.1.1.1)
Secondary: Google (8.8.8.8)
Tertiary: OpenDNS (208.67.222.222)
```

#### 2. SSL Optimization
```nginx
# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

## Maintenance

### Regular Tasks

#### Monthly
- [ ] Check SSL certificate expiration
- [ ] Review DNS records
- [ ] Test IPFS gateway functionality
- [ ] Monitor domain reputation

#### Quarterly
- [ ] Update SSL configuration
- [ ] Review security headers
- [ ] Test disaster recovery procedures
- [ ] Update DNS documentation

#### Annually
- [ ] Renew domain registration
- [ ] Review and update SSL certificates
- [ ] Audit DNS configuration
- [ ] Update security policies

### Backup Procedures

#### DNS Backup
```bash
# Export DNS records
# (Use your registrar's export function)

# Document configuration
# (Keep detailed records of all settings)
```

#### SSL Certificate Backup
```bash
# Backup certificates
sudo cp -r /etc/letsencrypt/live/your-domain.com/ /backup/ssl/

# Backup private keys
sudo cp /etc/ssl/private/your-domain.key /backup/ssl/
```

This comprehensive DNS setup guide ensures your multimedia authentication system is properly configured with secure, reliable, and performant domain and SSL infrastructure. 