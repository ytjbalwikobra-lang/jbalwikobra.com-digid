# Docker-based CLI Helper Scripts
# Use these scripts to run Vercel and Supabase CLI via Docker

Write-Host "=== Docker CLI Helper ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "E:\GITHUB\jbalwikobra.com-digid"

function Invoke-DockerNode {
    param([string]$Command)
    docker run -it --rm -v "${projectPath}:/app" -w /app node:24-alpine sh -c $Command
}

# Show available commands
Write-Host "Available Docker CLI Commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "npm install:" -ForegroundColor Green
Write-Host '  docker run -it --rm -v ${PWD}:/app -w /app node:24-alpine npm install'
Write-Host ""
Write-Host "npm start (development server):" -ForegroundColor Green  
Write-Host '  docker run -it --rm -v ${PWD}:/app -w /app -p 3000:3000 node:24-alpine npm start'
Write-Host ""
Write-Host "npm run build:" -ForegroundColor Green
Write-Host '  docker run -it --rm -v ${PWD}:/app -w /app node:24-alpine npm run build'
Write-Host ""
Write-Host "Vercel CLI:" -ForegroundColor Green
Write-Host '  docker run -it --rm -v ${PWD}:/app -v vercel-config:/root -w /app node:24-alpine npx vercel login'
Write-Host '  docker run -it --rm -v ${PWD}:/app -v vercel-config:/root -w /app node:24-alpine npx vercel'
Write-Host ""
Write-Host "Interactive shell:" -ForegroundColor Green
Write-Host '  docker run -it --rm -v ${PWD}:/app -w /app node:24-alpine sh'
Write-Host ""
