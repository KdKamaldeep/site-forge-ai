# Environment Setup Guide

This guide will help you create the necessary `.env` files for both backend and frontend.

## Backend Setup

Create a file named `.env` in the `backend/` directory with the following content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/microsite-empire

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters

# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here
```

### Quick Setup (Linux/Mac)

Run the setup script:
```bash
cd backend
chmod +x setup-env.sh
./setup-env.sh
```

### Quick Setup (Windows)

Run the setup script:
```cmd
cd backend
setup-env.bat
```

### Manual Setup

1. Create `backend/.env` file
2. Copy the content above
3. Update the following values:
   - **MONGODB_URI**: Update if using MongoDB Atlas or remote MongoDB
   - **JWT_SECRET**: Generate a strong random string (minimum 32 characters)
     - Linux/Mac: `openssl rand -base64 32`
     - Or use an online generator
   - **OPENAI_API_KEY**: Get from https://platform.openai.com/api-keys

## Frontend Setup

Create a file named `.env.local` in the `frontend/` directory with the following content:

```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Quick Setup (Linux/Mac)

Run the setup script:
```bash
cd frontend
chmod +x setup-env.sh
./setup-env.sh
```

### Quick Setup (Windows)

Run the setup script:
```cmd
cd frontend
setup-env.bat
```

### Manual Setup

1. Create `frontend/.env.local` file
2. Copy the content above
3. Update `NEXT_PUBLIC_API_BASE_URL` if your backend runs on a different port or domain

## Environment Variables Explained

### Backend Variables

- **PORT**: Port number for the Express server (default: 5000)
- **NODE_ENV**: Environment mode (`development` or `production`)
- **MONGODB_URI**: MongoDB connection string
  - Local: `mongodb://localhost:27017/microsite-empire`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/microsite-empire`
- **JWT_SECRET**: Secret key for JWT token signing (must be strong and secret!)
- **OPENAI_API_KEY**: API key for OpenAI (required for AI features)

### Frontend Variables

- **NEXT_PUBLIC_API_BASE_URL**: Base URL of the backend API
  - Local: `http://localhost:5000/api`
  - Production: `https://your-api-domain.com/api`

## Production Setup

For production deployment:

1. **Backend**:
   - Set `NODE_ENV=production`
   - Use a strong, randomly generated `JWT_SECRET`
   - Use production MongoDB connection string
   - Ensure `OPENAI_API_KEY` is set

2. **Frontend**:
   - Set `NEXT_PUBLIC_API_BASE_URL` to your production API URL
   - Build the app: `npm run build`

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` or `.env.local` files to version control
- These files are already in `.gitignore`
- Use different secrets for development and production
- Rotate secrets regularly in production

## Verification

After creating the files, verify they exist:

```bash
# Backend
ls backend/.env

# Frontend
ls frontend/.env.local
```

Then start the applications:

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

