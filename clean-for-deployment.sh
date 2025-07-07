#!/bin/bash

echo "🧹 Deep cleaning project for deployment..."

# Remove massive cache directories
echo "📁 Removing cache directories..."
rm -rf .cache
rm -rf .pythonlibs
rm -rf .npm
rm -rf .vite
rm -rf .turbo

# Remove Python files not needed for Node.js app
echo "🐍 Removing Python files..."
rm -rf *.py
rm -rf pyproject.toml
rm -rf uv.lock
rm -rf .venv
rm -rf __pycache__

# Remove development scripts
echo "📜 Removing development scripts..."
rm -f deploy*.sh
rm -f fix*.sh
rm -f cleanup*.sh
rm -f build*.sh
rm -f deployment*.sh

# Remove backup and old files
echo "💾 Removing backup files..."
rm -f *backup*
rm -f *original*
rm -f package-*.json
rm -f server/routes-*.ts

# Clean build artifacts if they exist
echo "🏗️ Cleaning build artifacts..."
rm -rf dist
rm -rf build
rm -rf .next
rm -rf .nuxt

# Remove documentation files
echo "📚 Removing documentation..."
rm -f *.md
rm -f docs

# Show final size
echo ""
echo "📊 Cleaned project size:"
du -sh . --exclude=node_modules --exclude=.git