#!/bin/sh
# Debug entrypoint script to verify build and nginx setup

# Try to write to debug log if volume is mounted, otherwise just stdout
DEBUG_LOG="/app/.cursor/debug.log"
if [ ! -w "$(dirname "$DEBUG_LOG")" ]; then
  DEBUG_LOG="/tmp/docker-debug.log"
fi

# Function to log debug info (both structured JSON and human-readable)
log_debug() {
  TIMESTAMP=$(date +%s000)
  MSG=$(echo "$1" | sed 's/"/\\"/g')
  JSON_LOG="{\"timestamp\":$TIMESTAMP,\"location\":\"docker-entrypoint.sh\",\"message\":\"$MSG\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"docker-startup\"}"
  echo "$JSON_LOG" >> "$DEBUG_LOG" 2>/dev/null || true
  echo "[DEBUG] $1"
}

log_debug "=== Docker Entrypoint Started ==="

# Hypothesis A: Check if dist folder exists in builder stage (we can't check this here, but we can check the result)
log_debug "Hypothesis A: Checking if files exist in /usr/share/nginx/html"

# Hypothesis C: Check if files were copied to nginx directory
if [ -d "/usr/share/nginx/html" ]; then
  FILE_COUNT=$(find /usr/share/nginx/html -type f | wc -l)
  log_debug "Directory exists. File count: $FILE_COUNT"
  
  if [ "$FILE_COUNT" -eq 0 ]; then
    log_debug "ERROR: No files found in /usr/share/nginx/html"
    echo "ERROR: No files found in /usr/share/nginx/html" >&2
  else
    log_debug "Files found. Listing contents:"
    ls -la /usr/share/nginx/html | head -20 | tee -a "$LOG_FILE"
    
    # Check for index.html specifically
    if [ -f "/usr/share/nginx/html/index.html" ]; then
      log_debug "index.html exists"
      INDEX_SIZE=$(stat -c%s /usr/share/nginx/html/index.html 2>/dev/null || stat -f%z /usr/share/nginx/html/index.html 2>/dev/null || echo "unknown")
      log_debug "index.html size: $INDEX_SIZE bytes"
    else
      log_debug "ERROR: index.html NOT found"
      echo "ERROR: index.html NOT found in /usr/share/nginx/html" >&2
    fi
  fi
else
  log_debug "ERROR: /usr/share/nginx/html directory does not exist"
  echo "ERROR: /usr/share/nginx/html directory does not exist" >&2
fi

# Hypothesis D: Check permissions
log_debug "Hypothesis D: Checking permissions"
if [ -d "/usr/share/nginx/html" ]; then
  PERMS=$(ls -ld /usr/share/nginx/html | awk '{print $1}')
  log_debug "Directory permissions: $PERMS"
  
  if [ -f "/usr/share/nginx/html/index.html" ]; then
    FILE_PERMS=$(ls -l /usr/share/nginx/html/index.html | awk '{print $1}')
    log_debug "index.html permissions: $FILE_PERMS"
  fi
fi

# Inject runtime configuration (API URL from environment variable)
log_debug "Injecting runtime configuration"
API_BASE_URL="${VITE_API_BASE_URL:-http://139.84.210.248:8080/api}"
log_debug "API_BASE_URL: $API_BASE_URL"

# Create config.js file with runtime configuration
# Use an IIFE to ensure it executes immediately and synchronously
CONFIG_JS="/usr/share/nginx/html/config.js"
cat > "$CONFIG_JS" <<EOF
// Runtime configuration injected at container startup
// Timestamp: $(date +%s) - Force reload if changed
(function() {
  'use strict';
  if (typeof window !== 'undefined') {
    window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
    window.__APP_CONFIG__.VITE_API_BASE_URL = "$API_BASE_URL";
    // Mark as loaded
    window.__APP_CONFIG_LOADED__ = true;
    // Debug: Log to console
    console.log('Config.js loaded:', window.__APP_CONFIG__);
  }
})();
EOF

if [ -f "$CONFIG_JS" ]; then
  log_debug "✓ config.js created successfully"
  chmod 644 "$CONFIG_JS"
  
  # Inject config.js script tag into index.html before other scripts
  # Use a blocking, synchronous script to ensure it loads before modules
  INDEX_HTML="/usr/share/nginx/html/index.html"
  if [ -f "$INDEX_HTML" ]; then
    # Find the first script tag and inject config.js before it
    # Use a more robust approach: find the title tag and inject after it
    if grep -q '<script' "$INDEX_HTML"; then
      # Inject before the first script tag, ensuring it's synchronous and blocking
      sed -i 's|<script|<script src="/config.js"></script>\n    <script|' "$INDEX_HTML" 2>/dev/null || \
      sed -i '' 's|<script|<script src="/config.js"></script>\n    <script|' "$INDEX_HTML" 2>/dev/null || {
        # Fallback: use a different approach
        sed -i 's|</title>|</title>\n    <script src="/config.js"></script>|' "$INDEX_HTML" 2>/dev/null || \
        sed -i '' 's|</title>|</title>\n    <script src="/config.js"></script>|' "$INDEX_HTML" 2>/dev/null || {
          log_debug "Warning: Could not inject config.js into index.html (non-critical)"
        }
      }
      log_debug "✓ config.js injected into index.html"
    else
      log_debug "Warning: No script tags found in index.html"
    fi
  fi
else
  log_debug "ERROR: Failed to create config.js"
  echo "ERROR: Failed to create config.js" >&2
fi

# Test nginx configuration
log_debug "Testing nginx configuration"
if nginx -t >/dev/null 2>&1; then
  log_debug "Nginx configuration is valid"
else
  log_debug "ERROR: Nginx configuration test failed"
  nginx -t 2>&1
  echo "ERROR: Nginx configuration test failed" >&2
fi

log_debug "=== Starting nginx ==="

# Execute the original nginx command
exec nginx -g "daemon off;"

