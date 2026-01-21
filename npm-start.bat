@echo off
REM Docker-based npm start helper - runs dev server on port 3000
docker run -it --rm -v %CD%:/app -w /app -p 3000:3000 node:24-alpine npm start
