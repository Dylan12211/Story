@echo off
echo Building Keycloak Provider...
cd /d "%~dp0"
call mvn clean package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)
echo Copying JAR to providers directory...
copy target\provider-1.0-SNAPSHOT.jar ..\..\providers\
if %ERRORLEVEL% NEQ 0 (
    echo Copy failed!
    exit /b 1
)
echo Build and copy completed successfully!
echo.
echo IMPORTANT: Restart Keycloak container to load the new provider:
echo   docker compose restart keycloak
