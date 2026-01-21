@echo off
REM Docker-based Vercel CLI helper with persistent config
REM This mounts a volume to persist Vercel authentication

if "%1"=="" (
    echo Usage: vercel-docker.bat [command]
    echo.
    echo Commands:
    echo   login     - Login to Vercel
    echo   link      - Link project to Vercel
    echo   deploy    - Deploy to preview
    echo   prod      - Deploy to production
    echo   env       - Manage environment variables
    echo   logs      - View logs
    echo   shell     - Interactive shell with Vercel
    echo.
    exit /b 0
)

if "%1"=="login" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel login
) else if "%1"=="link" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel link
) else if "%1"=="deploy" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel
) else if "%1"=="prod" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel --prod
) else if "%1"=="env" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel env %2 %3 %4
) else if "%1"=="logs" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel logs
) else if "%1"=="shell" (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine sh
) else (
    docker run -it --rm -v %CD%:/app -v vercel-config:/root -w /app node:24-alpine npx vercel %*
)
