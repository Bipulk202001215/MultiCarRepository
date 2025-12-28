# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 2: Development image (allows modifications)
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 3001

# Start development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]