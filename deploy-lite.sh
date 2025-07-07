#!/bin/bash

# Lightweight deployment script - removes problematic packages
echo "🚀 Starting lightweight deployment preparation..."

# Backup original package.json
cp package.json package-full.json
echo "✅ Backed up full package.json"

# Use lightweight package.json
cp package-production.json package.json
echo "✅ Switched to production package.json (removed puppeteer, sharp, ytdl-core)"

# Clean install with production dependencies only
echo "📦 Installing lightweight dependencies..."
rm -rf node_modules
npm ci --only=production

# Replace heavy services with lightweight alternatives
echo "🔄 Switching to lightweight services..."
if [ -f "server/services/pdfGenerator.ts" ]; then
    mv server/services/pdfGenerator.ts server/services/pdfGenerator-heavy.ts
    mv server/services/pdfGenerator-lite.ts server/services/pdfGenerator.ts
    echo "✅ Switched to lightweight PDF generator"
fi

# Build the application
echo "🏗️ Building application..."
npm run build

# Check deployment size
echo "📊 Deployment size check:"
du -sh . --exclude=node_modules --exclude=external_storage
du -sh node_modules

# Clean up temporary files
echo "🧹 Cleaning up..."
rm -rf .npm .cache .vite *.log tmp temp

echo "✅ Lightweight deployment ready!"
echo ""
echo "🎯 Deployment summary:"
echo "  - ❌ Removed puppeteer (prevents Chromium download issues)"
echo "  - ❌ Removed sharp (prevents native binary issues)"  
echo "  - ❌ Removed ytdl-core (prevents YouTube API issues)"
echo "  - ✅ Kept all core functionality"
echo "  - ✅ PDF generation uses HTML output (can be processed externally)"
echo "  - ✅ Image processing disabled (can be re-enabled with external service)"
echo "  - ✅ YouTube processing uses transcript-only approach"
echo ""
echo "🔧 Manual restore command:"
echo "  cp package-full.json package.json && npm install"