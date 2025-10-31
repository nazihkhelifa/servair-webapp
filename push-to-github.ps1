# Quick script to push servair-webapp to GitHub
# Make sure you've created the repository at: https://github.com/nazihkhelifa/servair-webapp

Write-Host "=== Pushing servair-webapp to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if remote already exists
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $response = Read-Host "Do you want to remove it and add a new one? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        git remote remove origin
    } else {
        Write-Host "Keeping existing remote." -ForegroundColor Green
    }
}

if (-not (git remote get-url origin 2>$null)) {
    Write-Host "Adding GitHub remote..." -ForegroundColor Cyan
    git remote add origin https://github.com/nazihkhelifa/servair-webapp.git
    Write-Host "Remote added successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing code to GitHub..." -ForegroundColor Cyan
git push -u origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository URL: https://github.com/nazihkhelifa/servair-webapp" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Common reasons:" -ForegroundColor Red
    Write-Host "  1. Repository doesn't exist yet. Create it at: https://github.com/new" -ForegroundColor Yellow
    Write-Host "  2. Authentication failed. You may need to use a Personal Access Token" -ForegroundColor Yellow
    Write-Host "  3. Repository name doesn't match. Check your repository name" -ForegroundColor Yellow
}

