FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    postgresql-client \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global node packages
RUN npm install -g tsx nodemon

# Switch to non-root user
USER node

# Set working directory
WORKDIR /workspace