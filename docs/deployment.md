# Deployment Guide

This guide covers deploying the Excel AI Assistant to various environments.

## Table of Contents

- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
  - [Server Deployment](#server-deployment)
  - [Add-in Deployment](#add-in-deployment)
- [Environment Configuration](#environment-configuration)
- [SSL Certificates](#ssl-certificates)
- [Monitoring & Logging](#monitoring--logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

1. **Node.js 18+** and **npm 9+**
2. **Excel Desktop** (Windows or macOS)
3. At least one API key (OpenAI, Anthropic, or Google)

### Step-by-Step Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/excel-ai-agent.git
cd excel-ai-agent
npm run install:all

# 2. Generate SSL certificates
npm run certs

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env and add your API key(s)

# 4. Start server (Terminal 1)
npm run dev:server

# 5. Start add-in dev server (Terminal 2)
npm run dev:addin

# 6. Sideload into Excel
# Insert > Get Add-ins > Upload My Add-in > Select addin/manifest.xml
```

### Verifying Local Setup

```bash
# Check server health
curl http://localhost:3001/api/health

# Check models endpoint
curl http://localhost:3001/api/models

# Verify add-in dev server
curl -k https://localhost:3000/taskpane.html
```

---

## Production Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Setup                          │
│                                                              │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │   Static Host   │         │    API Gateway/Server    │   │
│  │  (Add-in Files) │         │   (LLM Gateway + API)    │   │
│  │                 │         │                          │   │
│  │  - Vercel       │ HTTPS   │  - Cloud Run             │   │
│  │  - Netlify      │◄───────►│  - AWS Lambda            │   │
│  │  - Azure Blob   │         │  - Azure Functions       │   │
│  │  - S3 + CF      │         │  - Railway               │   │
│  └─────────────────┘         └─────────────────────────┘   │
│                                        │                     │
│                                        ▼                     │
│                              ┌─────────────────┐            │
│                              │   LLM Providers │            │
│                              │  OpenAI/Claude/ │            │
│                              │     Google      │            │
│                              └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Server Deployment

### Option 1: Google Cloud Run

Cloud Run is recommended for its simplicity and auto-scaling.

#### 1. Create Dockerfile

```dockerfile
# server/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy shared package
COPY shared/package*.json ./shared/
COPY shared/ ./shared/
RUN cd shared && npm ci && npm run build

# Copy server package
COPY server/package*.json ./server/
COPY server/ ./server/
RUN cd server && npm ci && npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/config ./server/config
COPY --from=builder /app/server/package*.json ./server/

# Install production dependencies
RUN cd shared && npm ci --only=production
RUN cd server && npm ci --only=production

WORKDIR /app/server

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/index.js"]
```

#### 2. Deploy to Cloud Run

```bash
# Build and deploy
cd excel-ai-agent

gcloud run deploy excel-ai-gateway \
  --source . \
  --dockerfile server/Dockerfile \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=${OPENAI_API_KEY}" \
  --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
  --set-env-vars "CORS_ORIGIN=https://your-addin-domain.com"
```

#### 3. Get the service URL

```bash
gcloud run services describe excel-ai-gateway --region us-central1 --format 'value(status.url)'
# Output: https://excel-ai-gateway-xxxxx-uc.a.run.app
```

---

### Option 2: Railway

Railway provides simple deployment with automatic builds.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

---

### Option 3: Docker Compose (Self-hosted)

```yaml
# docker-compose.yml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - CORS_ORIGIN=*
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

### Option 4: AWS Lambda (Serverless)

Use `@vendia/serverless-express` for Lambda compatibility.

```typescript
// server/src/lambda.ts
import serverlessExpress from '@vendia/serverless-express';
import { app } from './index';

export const handler = serverlessExpress({ app });
```

Deploy with AWS SAM or Serverless Framework.

---

## Add-in Deployment

### Option 1: Vercel

```bash
cd addin

# Install Vercel CLI
npm install -g vercel

# Build the add-in
npm run build

# Deploy
vercel --prod
```

Update `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null
}
```

---

### Option 2: Netlify

```bash
cd addin

# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

---

### Option 3: Azure Blob Storage + CDN

```bash
# Create storage account
az storage account create \
  --name excelaiaddin \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Standard_LRS

# Enable static website hosting
az storage blob service-properties update \
  --account-name excelaiaddin \
  --static-website \
  --index-document taskpane.html

# Upload files
az storage blob upload-batch \
  --account-name excelaiaddin \
  --destination '$web' \
  --source addin/dist
```

---

### Updating the Manifest

After deploying, update `addin/manifest.xml` with production URLs:

```xml
<!-- Update all localhost references -->
<IconUrl DefaultValue="https://your-addin-domain.com/assets/icon-32.png"/>
<HighResolutionIconUrl DefaultValue="https://your-addin-domain.com/assets/icon-64.png"/>

<AppDomains>
  <AppDomain>https://your-addin-domain.com</AppDomain>
  <AppDomain>https://your-api-domain.com</AppDomain>
</AppDomains>

<DefaultSettings>
  <SourceLocation DefaultValue="https://your-addin-domain.com/taskpane.html"/>
</DefaultSettings>

<!-- Update all bt:Url elements -->
<bt:Url id="Taskpane.Url" DefaultValue="https://your-addin-domain.com/taskpane.html"/>
```

---

### Configuring the Add-in API URL

Set the API URL at build time:

```bash
# Build with production API URL
VITE_API_URL=https://your-api-domain.com npm run build:addin
```

Or configure in `addin/.env.production`:
```env
VITE_API_URL=https://excel-ai-gateway-xxxxx-uc.a.run.app
```

---

## Distributing the Add-in

### Option 1: Direct Manifest Sideloading

Share the `manifest.xml` file with users. They can sideload it:
1. Open Excel
2. Insert > Get Add-ins > Upload My Add-in
3. Browse to manifest.xml

### Option 2: Centralized Deployment (Microsoft 365 Admin)

For organizations:
1. Go to Microsoft 365 Admin Center
2. Settings > Integrated Apps
3. Upload custom app > Upload manifest file
4. Assign to users/groups

### Option 3: Microsoft AppSource

For public distribution:
1. Create Partner Center account
2. Submit manifest and documentation
3. Pass certification review
4. Publish to AppSource

See: [Publish Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)

---

## Environment Configuration

### Server Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3001` |
| `CORS_ORIGIN` | Allowed CORS origins | No | `*` |
| `OPENAI_API_KEY` | OpenAI API key | Conditional* | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | Conditional* | - |
| `GOOGLE_API_KEY` | Google AI API key | Conditional* | - |
| `MODEL_OVERRIDES` | JSON array of model overrides | No | `[]` |
| `LOG_LEVEL` | Logging level | No | `info` |

*At least one API key is required.

### Add-in Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Gateway server URL | Yes (for production) |

---

## SSL Certificates

### Development

```bash
# Use office-addin-dev-certs
npm run certs
```

This installs self-signed certificates trusted by the system.

### Production

Production deployments should use proper SSL certificates:

- **Vercel/Netlify**: Automatic SSL via Let's Encrypt
- **Cloud Run**: Automatic SSL for custom domains
- **Self-hosted**: Use Certbot/Let's Encrypt

```bash
# Example: Certbot for self-hosted
sudo certbot --nginx -d your-domain.com
```

---

## Monitoring & Logging

### Server Logging

The server uses console logging. For production, consider:

```typescript
// Use structured logging
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

### Cloud Run Logging

Logs are automatically captured in Cloud Logging:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=excel-ai-gateway"
```

### Health Checks

Configure health checks for your platform:

```yaml
# Cloud Run
healthChecks:
  httpGet:
    path: /api/health
    port: 3001
```

### Metrics to Monitor

- Request latency (P50, P95, P99)
- Error rates by endpoint
- Token usage per request
- Active connections

---

## Security Considerations

### API Key Protection

- Never expose API keys in client-side code
- Use environment variables or secret managers
- Rotate keys periodically

### CORS Configuration

```bash
# Production: Restrict to known origins
CORS_ORIGIN=https://your-addin-domain.com
```

### Rate Limiting (Recommended)

```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Content Security Policy

Configure CSP headers for the add-in:

```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://appsforoffice.microsoft.com"
  );
  next();
});
```

---

## Troubleshooting

### Server Issues

**API key not working**:
```bash
# Verify key is set
echo $OPENAI_API_KEY | head -c 10

# Test directly
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

**CORS errors**:
```bash
# Check CORS_ORIGIN setting
curl -I -X OPTIONS https://your-api.com/api/health \
  -H "Origin: https://your-addin.com" \
  -H "Access-Control-Request-Method: POST"
```

### Add-in Issues

**Manifest not loading**:
```bash
# Validate manifest
npm run validate
```

**SSL certificate errors**:
```bash
# Regenerate certificates
npm run certs
# Restart Excel completely
```

### Cloud Run Issues

**Cold start latency**:
```bash
# Configure minimum instances
gcloud run services update excel-ai-gateway \
  --min-instances 1
```

**Memory issues**:
```bash
# Increase memory
gcloud run services update excel-ai-gateway \
  --memory 512Mi
```

---

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] CORS configured for production domains

### Server Deployment

- [ ] Deploy server to cloud platform
- [ ] Verify health endpoint
- [ ] Verify models endpoint
- [ ] Test chat endpoint with curl

### Add-in Deployment

- [ ] Update manifest URLs
- [ ] Build with production API URL
- [ ] Deploy to static hosting
- [ ] Verify HTTPS access

### Post-deployment

- [ ] Sideload manifest in Excel
- [ ] Test full workflow
- [ ] Monitor logs for errors
- [ ] Document deployment URLs

---

## Quick Reference

### Development URLs

- Server: `http://localhost:3001`
- Add-in: `https://localhost:3000`

### Production Commands

```bash
# Build everything
npm run build

# Server only
npm run build:server

# Add-in only
VITE_API_URL=https://api.example.com npm run build:addin

# Run tests
npm test
```

### Useful curl Commands

```bash
# Health check
curl https://your-api.com/api/health

# List models
curl https://your-api.com/api/models

# Test chat (minimal)
curl -X POST https://your-api.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"modelId":"gpt-4o-mini","messages":[{"id":"1","role":"user","content":"Hello","timestamp":0}],"workbookSchema":{"sheets":[]},"mode":"plan","contextScope":"workbook"}'
```
