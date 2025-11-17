# Deployment Guide for Aquifer

## Vercel Deployment

### Prerequisites
- A GitHub account
- A Vercel account (free tier works)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Aquifer Android VM"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Click "Deploy"

3. **Environment Variables** (if needed)
   - Currently none required
   - Future integrations may need API keys

### Build Configuration

The project includes `vercel.json` with:
- Next.js framework detection
- Build and install commands
- Routing configuration

### Post-Deployment

After deployment, your app will be available at:
- `https://your-project.vercel.app`

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Build Errors
- Ensure Node.js 18+ is installed
- Clear `.next` folder and rebuild
- Check for TypeScript errors: `npm run lint`

### Runtime Errors
- Check browser console for errors
- Ensure WebAssembly is supported (modern browsers)
- Check network tab for failed resource loads

## Performance Optimization

For production:
1. Enable Next.js Image Optimization
2. Add service worker for offline support
3. Optimize WebAssembly bundle size
4. Use CDN for static assets

