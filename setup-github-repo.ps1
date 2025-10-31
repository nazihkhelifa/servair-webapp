# PowerShell script to set up GitHub repository for servair-webapp
# This script will help you create and connect to a GitHub repository

param(
    [Parameter(Mandatory=$false)]
    [string]$GitHubUsername = "",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubToken = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "servair-webapp"
)

Write-Host "=== Servair WebApp - GitHub Repository Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is available
$hasGhCli = Get-Command gh -ErrorAction SilentlyContinue

if ($hasGhCli) {
    Write-Host "GitHub CLI detected. Using GitHub CLI..." -ForegroundColor Green
    
    # Check authentication
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GitHub CLI not authenticated. Please run: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    
    # Get current username
    $username = gh api user -q .login
    
    Write-Host "Creating private repository: $RepoName" -ForegroundColor Cyan
    gh repo create $RepoName --private --source=. --remote=origin --push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Repository created and code pushed successfully!" -ForegroundColor Green
        Write-Host "Repository URL: https://github.com/$username/$RepoName" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to create repository. It might already exist." -ForegroundColor Red
    }
} else {
    # Manual setup instructions
    Write-Host "GitHub CLI not found. Follow these steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1: Install GitHub CLI (Recommended)" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://cli.github.com/" -ForegroundColor White
    Write-Host "  2. Install and run: gh auth login" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 2: Manual Setup" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "  2. Repository name: $RepoName" -ForegroundColor White
    Write-Host "  3. Select: Private" -ForegroundColor White
    Write-Host "  4. DO NOT initialize with README/license" -ForegroundColor White
    Write-Host "  5. Click 'Create repository'" -ForegroundColor White
    Write-Host ""
    Write-Host "  6. Then run these commands:" -ForegroundColor Yellow
    Write-Host "     git remote add origin https://github.com/YOUR_USERNAME/$RepoName.git" -ForegroundColor White
    Write-Host "     git push -u origin master" -ForegroundColor White
    Write-Host ""
    
    # Try to use GitHub API if token is provided
    if ($GitHubToken -and $GitHubUsername) {
        Write-Host "Attempting to create repository via GitHub API..." -ForegroundColor Cyan
        
        $body = @{
            name = $RepoName
            private = $true
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "token $GitHubToken"
            "Accept" = "application/vnd.github.v3+json"
        }
        
        try {
            $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Body $body -Headers $headers
            Write-Host "Repository created successfully!" -ForegroundColor Green
            Write-Host "Repository URL: $($response.html_url)" -ForegroundColor Cyan
            
            # Add remote and push
            Write-Host "Adding remote and pushing code..." -ForegroundColor Cyan
            git remote add origin $response.clone_url
            git push -u origin master
            
            Write-Host "Setup complete!" -ForegroundColor Green
        } catch {
            Write-Host "Error creating repository: $_" -ForegroundColor Red
            Write-Host "Please follow the manual setup instructions above." -ForegroundColor Yellow
        }
    } else {
        Write-Host "To use GitHub API, provide username and token:" -ForegroundColor Yellow
        Write-Host "  .\setup-github-repo.ps1 -GitHubUsername YOUR_USERNAME -GitHubToken YOUR_TOKEN" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Set up Azure deployment (see AZURE_DEPLOYMENT.md)" -ForegroundColor White
Write-Host "2. Configure environment variables in Azure Portal" -ForegroundColor White
Write-Host "3. Test your deployment" -ForegroundColor White

