@echo off
REM Docker-based Supabase CLI helper
REM Uses custom built supabase-cli Docker image

if "%1"=="" (
    echo Usage: supabase-docker.bat [command]
    echo.
    echo Commands:
    echo   login     - Login to Supabase
    echo   link      - Link to remote project (use: link --project-ref YOUR_REF)
    echo   status    - Show local status
    echo   db push   - Push migrations to remote
    echo   db pull   - Pull remote schema
    echo   db reset  - Reset local database
    echo   gen types - Generate TypeScript types
    echo   version   - Show CLI version
    echo.
    echo Examples:
    echo   supabase-docker.bat login
    echo   supabase-docker.bat link --project-ref abcdefghijklmnop
    echo   supabase-docker.bat db push
    echo   supabase-docker.bat gen types typescript --local
    echo.
    exit /b 0
)

REM Run Supabase CLI commands using custom image
docker run -it --rm ^
    -v %CD%:/app ^
    -v supabase-config:/root/.supabase ^
    -w /app ^
    supabase-cli %*
