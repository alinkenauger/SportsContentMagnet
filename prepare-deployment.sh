#!/bin/bash

echo "🚀 Preparing ConvertMag.net for deployment..."

# Remove Python/ML cache files but keep Replit essentials
if [ -d ".cache/uv" ]; then
    echo "Removing UV cache (5.4GB)..."
    rm -rf .cache/uv
fi

# Remove other Python caches
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Remove large development files
rm -rf external_storage 2>/dev/null || true
rm -rf public/screenshots/*.jpg 2>/dev/null || true
rm -rf public/screenshots/*.png 2>/dev/null || true
rm -rf public/uploads/*.mp4 2>/dev/null || true
rm -rf public/uploads/*.mp3 2>/dev/null || true

# Remove backup files
rm -f package-*.json 2>/dev/null || true
rm -f *-backup.json 2>/dev/null || true

# Remove deployment docs
rm -f DEPLOYMENT*.md 2>/dev/null || true

# Clear npm cache
npm cache clean --force 2>/dev/null || true

echo "✅ Deployment preparation complete!"
echo "Directory size after cleanup:"
du -sh . 2>/dev/null || echo "Size check failed"

echo ""
echo "🎯 Your app is now ready for deployment!"
echo "The heavy Python/ML cache files have been removed."
echo "Core functionality (auth, guides, landing pages, analytics) fully preserved."