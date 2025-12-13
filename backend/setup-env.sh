#!/bin/bash

# Setup script for backend .env file

echo "Setting up backend .env file..."

cat > .env << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/microsite-empire

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters

# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here
EOF

echo "✅ Backend .env file created!"
echo "⚠️  Please update the following values:"
echo "   - MONGODB_URI (if using remote MongoDB)"
echo "   - JWT_SECRET (generate a strong random string)"
echo "   - OPENAI_API_KEY (get from https://platform.openai.com/api-keys)"

