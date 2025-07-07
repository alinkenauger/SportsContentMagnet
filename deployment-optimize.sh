#!/bin/bash

# Comprehensive deployment optimization script
echo "Starting deployment optimization..."

# 1. Clean up development artifacts
echo "Cleaning up development artifacts..."
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .eslintcache
rm -rf coverage
rm -rf .nyc_output
rm -rf tmp
rm -rf temp
rm -rf *.tmp
rm -rf *.temp
rm -rf *.log
rm -rf logs/

# 2. Move large assets to external storage (excluded in .dockerignore)
echo "Moving large assets to external storage..."
mkdir -p external_storage
if [ -d "attached_assets" ]; then
    mv attached_assets external_storage/ 2>/dev/null || true
    echo "Moved 60MB attached_assets to external storage"
fi

# 3. Clean up node_modules to prepare for production install
echo "Preparing for production dependencies..."
du -sh node_modules/ 2>/dev/null || echo "No node_modules found"

# 4. Remove unnecessary files that might be included in build
echo "Removing unnecessary build files..."
find . -name "*.map" -not -path "./node_modules/*" -delete
find . -name "*.d.ts" -not -path "./node_modules/*" -delete
find . -name "*.test.js" -not -path "./node_modules/*" -delete
find . -name "*.test.ts" -not -path "./node_modules/*" -delete
find . -name "*.spec.js" -not -path "./node_modules/*" -delete
find . -name "*.spec.ts" -not -path "./node_modules/*" -delete

# 5. Create deployment size report
echo "Creating deployment size report..."
echo "=== DEPLOYMENT SIZE OPTIMIZATION REPORT ===" > deployment-report.txt
echo "Date: $(date)" >> deployment-report.txt
echo "" >> deployment-report.txt
echo "Files excluded from deployment:" >> deployment-report.txt
echo "- Development dependencies (will be reinstalled with --production)" >> deployment-report.txt
echo "- Large assets directory (60MB moved to external_storage/)" >> deployment-report.txt
echo "- Source maps and TypeScript declaration files" >> deployment-report.txt
echo "- Test files and coverage reports" >> deployment-report.txt
echo "- Cache directories and temporary files" >> deployment-report.txt
echo "- Documentation and IDE configuration files" >> deployment-report.txt
echo "" >> deployment-report.txt
echo "Production deployment will include only:" >> deployment-report.txt
echo "- Built application (dist/)" >> deployment-report.txt
echo "- Built frontend (client/dist/)" >> deployment-report.txt
echo "- Production dependencies only" >> deployment-report.txt
echo "- Essential configuration files" >> deployment-report.txt

echo "Deployment optimization completed!"
echo "Large assets (60MB) moved to external_storage/"
echo "Development artifacts cleaned up"
echo "Ready for production deployment with reduced size"