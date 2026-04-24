@echo off
echo Building Keycloak Provider...
cd /d "%~dp0"
call mvn clean package
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)
echo Copying JAR to providers directory...
copy target\provider-1.0-SNAPSHOT.jar providers\
if %ERRORLEVEL% NEQ 0 (
    echo Copy failed!
    exit /b 1
)
echo Build and copy completed successfully!
