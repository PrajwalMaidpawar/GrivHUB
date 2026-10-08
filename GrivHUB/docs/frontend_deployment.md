# GrievanceHUB Enterprise — Frontend Deployment Guide

This guide describes how to build, optimize, and deploy the **GrievanceHUB React 19 + Vite + Tailwind CSS Single Page Application** to production hosting platforms.

---

## 1. Prerequisites & Node.js Environment

| Requirement | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **Node.js** | Node.js v18.18.0+ | Node.js v20 LTS or v22 LTS |
| **Package Manager** | npm v9+ / bun v1.0+ | npm v10+ / bun v1.1+ |
| **Browser Compatibility** | Modern Evergreen Browsers | Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ |

---

## 2. Environment Variable Configuration

Create a `.env.production` file at the root of the project:

```ini
# ==============================================================================
# GrievanceHUB Frontend Production Configuration
# ==============================================================================

# API Base URL:
# - Use '/api' if frontend and backend are hosted under the same domain behind Nginx/Caddy
# - Use 'https://api.grievancehub.gov.in/api' if hosted on a distinct API subdomain
VITE_API_BASE_URL=/api

# Application Metadata
VITE_APP_TITLE=GrievanceHUB - AI Civic Grievance Management System
VITE_DEFAULT_LOCALE=en
```

---

## 3. Production Build Execution

Execute the production build:

```bash
# Clean previous builds
rm -rf dist

# Install dependencies (frozen lockfile)
npm ci

# Run Vite production build with Tailwind CSS compilation
npm run build
```

### Build Output Verification:
The output is generated in the `/dist` directory:
- `dist/index.html`: Entry HTML document
- `dist/assets/index-[hash].js`: Minified application bundle with tree-shaken dependencies
- `dist/assets/index-[hash].css`: Optimized utility CSS classes

---

## 4. Web Server Deployment Configurations

### Option 4.1: Production Nginx Server Block (SPA Fallback)
Create `/etc/nginx/sites-available/grievancehub-web.conf`:

```nginx
server {
    listen 80;
    server_name grievancehub.gov.in www.grievancehub.gov.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grievancehub.gov.in www.grievancehub.gov.in;

    root /var/www/grievancehub/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/grievancehub.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grievancehub.gov.in/privkey.pem;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA Client-Side Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching (1 Year)
    location ~* \.(?:css|js|woff2?|eot|ttf|otf|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Backend API Reverse Proxy (Same-origin API requests)
    location /api/ {
        proxy_pass http://127.0.0.1:8005/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Option 4.2: Vercel / Netlify Single-Page Application Hosting
For Vercel or Netlify static hosting, routing rewrites are configured automatically. Ensure the redirect rewrite is placed in `public/_redirects`:

```text
/*    /index.html   200
```

---

## 5. Multi-Role User Simulation & Auth Persistence

The application maintains user session state and active role contexts in browser `localStorage`:
- `grievancehub_active_user_id`: Current logged-in user identifier
- `grievancehub_users`: Seeded directory of citizen, officer, and administrator credentials
- `grievancehub_custom_records`: Dynamically submitted grievances and offline cache

When switching roles (Citizen / Officer / Admin), `apiClient.js` automatically intercepts outgoing HTTP requests and injects the corresponding authentication headers:
- `X-User-Id`
- `X-User-Role`
- `X-Officer-Id`
- `X-Department-Id`

---

## 6. Frontend Troubleshooting & FAQ

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| **`404 Not Found` when refreshing deep URLs** | Web server lacks SPA fallback rule | Configure `try_files $uri $uri/ /index.html;` in Nginx or add `_redirects` for Netlify |
| **Network Error / CORS Error** | `VITE_API_BASE_URL` points to inaccessible host or backend CORS is blocking | Set `VITE_API_BASE_URL=/api` and verify backend `CORS_ALLOWED_ORIGINS` |
| **Blank Screen / JS Error** | Outdated browser or missing polyfills | Ensure modern Evergreen browser is used (ES2022+ compatible) |
| **Styles not loading** | Missing Tailwind CSS runtime | Check `@import "tailwindcss";` in `src/index.css` |
