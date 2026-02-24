@echo off
echo Starting Auto Write Book (Production)...

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
)

if not exist "dist\index.html" (
  echo Building client...
  call npm.cmd run build
)

if not exist "api\dist\server.js" (
  echo Building server...
  call npm.cmd run build:server
)

call npm.cmd run start:prod
pause
