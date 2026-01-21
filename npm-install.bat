@echo off
REM Docker-based npm install helper
docker run -it --rm -v %CD%:/app -w /app node:24-alpine npm install
