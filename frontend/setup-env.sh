#!/bin/bash

# Setup script for frontend .env.local file

echo "Setting up frontend .env.local file..."

cat > .env.local << 'EOF'
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
EOF

echo "✅ Frontend .env.local file created!"
echo "⚠️  Update NEXT_PUBLIC_API_BASE_URL if your backend runs on a different port/domain"

