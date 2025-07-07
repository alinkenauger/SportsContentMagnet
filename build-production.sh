#!/bin/bash

# Production build script
echo "🔨 Starting production build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🏗️ Building application..."
npm run build

# Run cleanup
echo "🧹 Running cleanup..."
./cleanup-build.sh

echo "✅ Production build complete!"
echo "📊 Final deployment size:"
du -sh . | head -1