@echo off
REM Setup script for frontend .env.local file (Windows)

echo Setting up frontend .env.local file...

(
echo # Backend API Base URL
echo NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
) > .env.local

echo ✅ Frontend .env.local file created!
echo ⚠️  Update NEXT_PUBLIC_API_BASE_URL if your backend runs on a different port/domain

pause

