#!/bin/bash

# Build cleanup script to reduce deployment size
echo "Starting build cleanup..."

# Remove unnecessary cache files
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist/*.map
rm -rf dist/**/*.map

# Remove TypeScript declaration files from dist
find dist -name '*.d.ts' -delete

# Remove development-only files
rm -rf coverage
rm -rf .nyc_output
rm -rf .eslintcache

# Remove temporary files
rm -rf tmp
rm -rf temp
rm -rf *.tmp
rm -rf *.temp

# Remove log files
rm -rf *.log
rm -rf logs/

echo "Build cleanup completed!"