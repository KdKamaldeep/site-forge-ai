@echo off
REM Setup script for backend .env file (Windows)

echo Setting up backend .env file...

(
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=development
echo.
echo # MongoDB Connection
echo MONGODB_URI=mongodb://localhost:27017/microsite-empire
echo.
echo # JWT Secret (CHANGE THIS IN PRODUCTION!)
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
echo.
echo # OpenAI API Key (Required for AI features)
echo OPENAI_API_KEY=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
) > .env

echo ✅ Backend .env file created!
echo ⚠️  Please update the following values:
echo    - MONGODB_URI (if using remote MongoDB)
echo    - JWT_SECRET (generate a strong random string)
echo    - OPENAI_API_KEY (get from https://platform.openai.com/api-keys)

pause

