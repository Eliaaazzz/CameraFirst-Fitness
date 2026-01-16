#!/bin/bash
# Configure CORS for Cloudflare R2 bucket to allow direct uploads from frontend
#
# This script sets up CORS rules on the R2 bucket to allow:
# - PUT requests for presigned URL uploads
# - GET requests for reading images
# - From the aurafitness.org domain and localhost for development
#
# Prerequisites:
# - AWS CLI installed and configured with R2 credentials
# - Environment variables: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
#
# Usage:
#   ./scripts/setup/configure-r2-cors.sh

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check required environment variables
if [ -z "$R2_ENDPOINT" ] || [ -z "$R2_ACCESS_KEY" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_BUCKET_NAME" ]; then
    echo "Error: Missing required environment variables"
    echo "Required: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    exit 1
fi

echo "Configuring CORS for R2 bucket: $R2_BUCKET_NAME"
echo "Endpoint: $R2_ENDPOINT"

# Create CORS configuration JSON
# Using "*" for AllowedOrigins to allow all origins (required for presigned URL uploads)
CORS_CONFIG=$(cat <<'EOF'
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF
)

# Write CORS config to temp file
TEMP_FILE=$(mktemp)
echo "$CORS_CONFIG" > "$TEMP_FILE"

echo "CORS Configuration:"
cat "$TEMP_FILE"
echo ""

# Apply CORS configuration using AWS CLI with R2 endpoint
# R2 requires region to be 'auto' or one of: wnam, enam, weur, eeur, apac, oc
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION="auto" \
aws s3api put-bucket-cors \
    --bucket "$R2_BUCKET_NAME" \
    --cors-configuration "file://$TEMP_FILE" \
    --endpoint-url "$R2_ENDPOINT" \
    --region "auto"

# Clean up temp file
rm "$TEMP_FILE"

echo ""
echo "✅ CORS configuration applied successfully!"
echo ""

# Verify CORS configuration
echo "Verifying CORS configuration..."
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION="auto" \
aws s3api get-bucket-cors \
    --bucket "$R2_BUCKET_NAME" \
    --endpoint-url "$R2_ENDPOINT" \
    --region "auto"

echo ""
echo "Done! The R2 bucket is now configured to accept uploads from:"
echo "  - https://aurafitness.org"
echo "  - https://www.aurafitness.org"
echo "  - https://app.aurafitness.org"
echo "  - http://localhost:* (for development)"