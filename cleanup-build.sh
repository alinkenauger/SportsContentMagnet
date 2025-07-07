#!/bin/bash

# Build cleanup script for deployment optimization
echo "🧹 Cleaning up build artifacts for deployment..."

# Remove development dependencies node_modules
echo "📦 Removing development dependencies..."
rm -rf node_modules
npm ci --only=production

# Clean up cache files
echo "🗑️ Cleaning cache files..."
rm -rf .npm
rm -rf .cache
rm -rf .vite
rm -rf .nyc_output
rm -rf coverage
rm -rf *.log
rm -rf npm-debug.log*
rm -rf yarn-debug.log*
rm -rf yarn-error.log*

# Clean up temporary files
echo "🧽 Cleaning temporary files..."
rm -rf tmp
rm -rf temp
rm -rf *.tmp
rm -rf *.temp

# Clean up TypeScript cache
echo "🔧 Cleaning TypeScript cache..."
rm -rf *.tsbuildinfo

# Clean up source maps (not needed in production)
echo "🗺️ Removing source maps..."
find dist -name "*.map" -delete 2>/dev/null || true
find client/dist -name "*.map" -delete 2>/dev/null || true

# Clean up test files
echo "🧪 Removing test files..."
rm -rf test
rm -rf tests
rm -rf __tests__
rm -rf spec

# Clean up documentation
echo "📚 Removing documentation..."
rm -rf docs
rm -rf documentation
rm -rf examples

# Clean up OS files
echo "🖥️ Cleaning OS files..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true

# Clean up editor files
echo "✏️ Cleaning editor files..."
rm -rf .vscode
rm -rf .idea
rm -rf *.swp
rm -rf *.swo

echo "✅ Build cleanup complete!"
echo "📊 Checking final size..."
du -sh . | head -1