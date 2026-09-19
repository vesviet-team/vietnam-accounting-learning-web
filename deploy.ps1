# Deploy script for vietnam-accounting-learning-web to tuananh@192.168.1.114
param(
    [string]$RemoteHost = "tuananh@192.168.1.114",
    [string]$RemoteDir = "~/vietnam-accounting-learning-web"
)

$ErrorActionPreference = "Stop"

Write-Host "==> [1/4] Packaging project files into deploy.tar.gz..." -ForegroundColor Cyan
if (Test-Path "deploy.tar.gz") { Remove-Item "deploy.tar.gz" -Force }
tar.exe -czf deploy.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude=tests --exclude=deploy.tar.gz .

Write-Host "==> [2/4] Transferring package to ${RemoteHost}:${RemoteDir}..." -ForegroundColor Cyan
ssh $RemoteHost "mkdir -p $RemoteDir"
scp.exe deploy.tar.gz "${RemoteHost}:${RemoteDir}/deploy.tar.gz"

Write-Host "==> [3/4] Extracting and building Docker container on remote server..." -ForegroundColor Cyan
ssh $RemoteHost "cd $RemoteDir && tar -xzf deploy.tar.gz && rm deploy.tar.gz && docker compose up -d --build"

Write-Host "==> [4/4] Verifying container status..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
ssh $RemoteHost "docker ps --filter 'name=vietnam-accounting-web' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

if (Test-Path "deploy.tar.gz") { Remove-Item "deploy.tar.gz" -Force }
Write-Host "==> Deployment Complete! Access at: http://192.168.1.114:8550/" -ForegroundColor Green
