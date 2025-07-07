#!/bin/bash

# Complete deployment optimization script
echo "🚀 Starting deployment optimization..."

# Check current size
echo "📊 Current project size:"
du -sh . | head -1

# Move large assets to external storage (if not already moved)
if [ -d "attached_assets" ]; then
    echo "📁 Moving attached_assets to external storage..."
    mkdir -p external_storage
    rm -rf external_storage/attached_assets
    mv attached_assets external_storage/
    echo "✅ Large assets moved to external storage"
else
    echo "✅ Large assets already in external storage"
fi

# Run production build
echo "🏗️ Running production build..."
npm run build

# Clean up for deployment
echo "🧹 Cleaning up for deployment..."
./cleanup-build.sh

# Final size check
echo "📊 Final deployment size:"
du -sh . | head -1

echo "✅ Deployment optimization complete!"
echo ""
echo "🔍 Optimization summary:"
echo "  - ✅ .dockerignore created to exclude large files"
echo "  - ✅ Multi-stage Dockerfile for production builds"
echo "  - ✅ Large assets moved to external storage"
echo "  - ✅ Development dependencies removed"
echo "  - ✅ Cache and temporary files cleaned"
echo "  - ✅ Source maps removed"
echo ""
echo "🎯 Your deployment should now be under 300MB!"