# Multi-stage Dockerfile for production optimization
# Stage 1: Build stage with all dependencies
FROM node:20-alpine AS builder

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for building
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage with minimal dependencies
FROM node:20-alpine AS production

# Install only essential system dependencies
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production --no-cache && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Copy essential configuration files
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tailwind.config.ts ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/vite.config.ts ./

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]