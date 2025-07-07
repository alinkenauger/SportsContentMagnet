#!/bin/bash

echo "🚀 Creating reliable deployment configuration..."

# Create deployment-specific .dockerignore
cat > .dockerignore.deployment << 'EOF'
# Development files
*.md
*.txt
*.log
.env.local
.env.development

# Version control
.git
.gitignore

# Dependencies that will be rebuilt
node_modules

# Build artifacts
dist
client/dist

# Large development assets
external_storage
attached_assets
public/screenshots
public/uploads

# Python files
*.py
*.pyc
__pycache__
pyproject.toml
uv.lock

# Cache directories
.npm
.cache
.vite
.turbo

# IDE files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.temp
.tmp

# Testing
coverage
.nyc_output

# Documentation
docs
*.md
!README.md

# Development scripts
deploy*.sh
cleanup*.sh
build*.sh
deployment*.sh
validate*.sh

# Package manager files
package-lock.json
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

# Copy deployment dockerignore
cp .dockerignore.deployment .dockerignore

# Add health check endpoint
echo "🏥 Adding health check endpoint..."
cat >> server/routes.ts << 'EOF'

  // Health check endpoint for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      mode: process.env.NODE_ENV || 'unknown'
    });
  });
EOF

# Build deployment image
echo "🏗️ Building deployment image..."
docker build -f Dockerfile.deployment -t convertmag-deployment .

# Check image size
echo "📊 Deployment image analysis:"
docker images convertmag-deployment --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "✅ Reliable deployment configuration complete!"
echo ""
echo "🎯 Ready for deployment with:"
echo "  ✅ Multi-stage Dockerfile removes heavy packages during build"
echo "  ✅ Deployment checker automatically detects available services"
echo "  ✅ Lightweight services provide graceful fallbacks"
echo "  ✅ Health check endpoint for monitoring"
echo "  ✅ Optimized .dockerignore for minimal deployment size"
echo ""
echo "🚀 Deploy with: docker run -p 5000:5000 convertmag-deployment"