# Deployment Guide

## Deployment Options

### 1. Static Hosting (Recommended)

This application is built as a static site and can be deployed to any static hosting provider:

#### Netlify
1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Configure redirects for SPA routing

#### Vercel
1. Connect your repository to Vercel
2. Vercel will automatically detect Vite and build
3. Deploy with zero configuration

#### GitHub Pages
1. Build: `npm run build`
2. Deploy the `dist` folder to gh-pages branch
3. Enable GitHub Pages in repository settings

### 2. Self-Hosted

#### Using Node.js Server
```bash
# Install serve globally
npm install -g serve

# Build the project
npm run build

# Serve the built files
serve -s dist -l 3000
```

#### Using Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Configuration

For production deployment, consider:

1. **Performance Optimization**
   - Enable gzip compression
   - Set up CDN for static assets
   - Optimize images and fonts

2. **SEO Configuration**
   - Update meta tags in `index.html`
   - Add structured data for healthcare services
   - Configure social media previews

3. **Analytics**
   - Add Google Analytics or similar
   - Set up error tracking (Sentry)
   - Monitor performance metrics

4. **Security Headers**
   - Content Security Policy
   - X-Frame-Options
   - X-Content-Type-Options

## Production Checklist

- [ ] Update contact information
- [ ] Configure proper domain name
- [ ] Set up SSL certificate
- [ ] Test on mobile devices
- [ ] Verify accessibility compliance
- [ ] Test in low-bandwidth conditions
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy