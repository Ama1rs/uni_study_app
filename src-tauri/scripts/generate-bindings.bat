@echo off
REM Script to regenerate TypeScript bindings from Rust structs
REM Run this whenever you modify Rust structs that are exported to TypeScript

echo Generating TypeScript bindings from Rust structs...
cd /d "%~dp0.."

REM Run tests to trigger ts-rs export
cargo test

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Copying generated bindings to frontend...
    xcopy /Y "bindings\*.ts" "..\src\bindings\"
    echo.
    echo Done! TypeScript bindings have been updated in src\bindings\
) else (
    echo.
    echo ERROR: Tests failed. Bindings may not have been generated correctly.
    exit /b 1
)
