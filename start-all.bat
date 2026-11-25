@echo off
echo ====================================================================
echo   SMART LIBRARY MANAGEMENT SYSTEM (MERN Stack + Neo4j Graph DB)
echo   University Practical & Demonstration Launcher
echo ====================================================================
echo.

echo [1/3] Starting Local MongoDB Database...
start "MongoDB Server" cmd /k "mongod --dbpath server\data\db --setParameter diagnosticDataCollectionEnabled=false --port 27017"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Express Backend API (Port 5000)...
start "Backend API (Express)" cmd /k "cd server && npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Vite React Frontend (Port 5173)...
start "Frontend (React + Vite)" cmd /k "cd client && npm run dev"

echo.
echo ====================================================================
echo   All services launched!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   Health:   http://localhost:5000/api/health
echo ====================================================================
echo.
pause
