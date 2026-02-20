FROM mcr.microsoft.com/devcontainers/python:3.12

# Install Node.js (v20) for the Vite frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install comprehensive Linux and development utilities
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    wget \
    tmux \
    htop \
    build-essential \
    jq \
    gh \
    && rm -rf /var/lib/apt/lists/*

# Install global Node.js utilities for web development
RUN npm install -g npm@latest yarn vite eslint prettier

# Set the default working directory
WORKDIR /workspace
