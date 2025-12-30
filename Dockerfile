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

# Debug: Verify build output exists (Hypothesis A & B)
RUN echo "=== Build Verification ===" && \
    if [ -d "/app/dist" ]; then \
      echo "✓ dist directory exists" && \
      FILE_COUNT=$(find /app/dist -type f | wc -l) && \
      echo "✓ File count in dist: $FILE_COUNT" && \
      if [ "$FILE_COUNT" -eq 0 ]; then \
        echo "✗ ERROR: dist directory is empty!" && \
        exit 1; \
      fi && \
      if [ -f "/app/dist/index.html" ]; then \
        echo "✓ index.html exists" && \
        ls -lh /app/dist/index.html; \
      else \
        echo "✗ ERROR: index.html not found in dist!" && \
        echo "Contents of dist:" && \
        ls -la /app/dist && \
        exit 1; \
      fi && \
      echo "=== Build verification complete ==="; \
    else \
      echo "✗ ERROR: dist directory does not exist!" && \
      exit 1; \
    fi

# Stage 2: Serve with nginx (Production)
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script for debugging
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use entrypoint script to debug and start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]

# Stage 3: Development image (allows modifications)
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