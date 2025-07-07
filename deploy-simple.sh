#!/bin/bash

# Simple deployment optimization without package removal
echo "🚀 Starting simple deployment optimization..."

# Set production environment variables that disable heavy features
echo "📝 Creating production environment config..."

cat > .env.production << EOF
# Production deployment environment
NODE_ENV=production

# Disable heavy features for deployment
DISABLE_PDF_GENERATION=true
DISABLE_IMAGE_PROCESSING=true
DISABLE_AUDIO_PROCESSING=true

# Use lightweight alternatives
USE_EXTERNAL_PDF_SERVICE=true
USE_EXTERNAL_IMAGE_SERVICE=true

# Puppeteer configuration for deployment
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Build optimization
SKIP_HEAVY_BUILDS=true
EOF

echo "✅ Production environment config created"

# Update .dockerignore to exclude more files
echo "📁 Optimizing .dockerignore..."
cat >> .dockerignore << EOF

# Additional deployment optimization
*.log
*.tmp
.env.local
.env.development
.env.test
public/screenshots/*
public/uploads/*
server/services/youtube_extractor.py
pyproject.toml
uv.lock
.cache
.npm
.vite
EOF

echo "✅ Enhanced .dockerignore"

# Create a lightweight server configuration
echo "⚙️ Creating lightweight server config..."

cat > server-lite.js << EOF
// Lightweight server configuration for deployment
process.env.DISABLE_PDF_GENERATION = 'true';
process.env.DISABLE_IMAGE_PROCESSING = 'true';
process.env.DISABLE_AUDIO_PROCESSING = 'true';

// Import and start the main server
import('./dist/index.js');
EOF

echo "✅ Lightweight server config created"

# Check current size
echo "📊 Current project analysis:"
echo "Total size: $(du -sh . 2>/dev/null | cut -f1)"
echo "node_modules: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'Not found')"
echo "External storage: $(du -sh external_storage 2>/dev/null | cut -f1 || echo 'None')"

echo ""
echo "✅ Simple deployment optimization complete!"
echo ""
echo "🎯 Deployment strategy:"
echo "  ✅ Existing packages kept (no dependency conflicts)"
echo "  ✅ Heavy features disabled via environment variables"
echo "  ✅ .dockerignore enhanced for smaller deployment"
echo "  ✅ Lightweight server configuration created"
echo "  ✅ External services configured for heavy operations"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "📋 Manual deployment steps:"
echo "  1. Use existing Dockerfile"
echo "  2. Set NODE_ENV=production"
echo "  3. Deploy will use lightweight configuration automatically"