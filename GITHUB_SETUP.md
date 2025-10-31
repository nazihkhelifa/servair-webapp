# GitHub Repository Setup Instructions

## Creating a New Private GitHub Repository

Follow these steps to create a new private GitHub repository and push your code:

### Step 1: Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Fill in the repository details:
   - **Repository name**: `servair-webapp` (or your preferred name)
   - **Description**: "Fleet management web application built with Next.js"
   - **Visibility**: Select **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **Create repository**

### Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

```bash
# Add GitHub remote (replace <your-username> with your GitHub username)
git remote add origin https://github.com/<your-username>/servair-webapp.git

# Or if you prefer SSH (if you have SSH keys set up):
# git remote add origin git@github.com:<your-username>/servair-webapp.git

# Verify the remote was added
git remote -v
```

### Step 3: Push Your Code to GitHub

```bash
# Push your code to GitHub
git push -u origin master
```

If your default branch is named `main` instead of `master`:
```bash
# Rename your branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Set Up Azure Deployment

After pushing to GitHub, update your Azure App Service to use the new GitHub repository:

#### Option A: Use GitHub as Deployment Source

1. Go to Azure Portal → Your App Service
2. Navigate to **Deployment Center**
3. Select **GitHub** as the source
4. Authorize GitHub connection
5. Select your repository and branch
6. Azure will automatically deploy on every push

#### Option B: Keep Using Local Git

If you want to continue using Local Git deployment with Azure:

1. Update the Azure remote URL:
```bash
# Remove old Azure remote (if exists)
git remote remove azure

# Add Azure remote with your credentials
git remote add azure https://servair-webapp-gde7dgdye2dnasgt.scm.francecentral-01.azurewebsites.net:443/servair-webapp.git
```

2. Push to Azure:
```bash
git push azure master
# Use username: $servair-webapp
# Use password: [Your Azure deployment password]
```

### Step 5: Configure Branch Protection (Recommended)

For production repositories, set up branch protection:

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Add a branch protection rule for `master` or `main`
4. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date

## Quick Reference Commands

```bash
# Check current remotes
git remote -v

# Add GitHub remote
git remote add origin https://github.com/<username>/servair-webapp.git

# Push to GitHub
git push -u origin master

# Push to Azure (if using Local Git)
git push azure master

# Pull from GitHub
git pull origin master

# View commit history
git log --oneline
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

**For HTTPS:**
- Use a Personal Access Token (PAT) instead of password
- Generate token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Use token as password when pushing

**For SSH:**
- Set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- Use SSH URL for remote: `git@github.com:username/repo.git`

### Large Files

If you have large files (>100MB), consider using Git LFS:
```bash
git lfs install
git lfs track "*.csv"
git add .gitattributes
git commit -m "Add Git LFS tracking for large files"
```

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push code to GitHub
3. ✅ Set up Azure deployment (GitHub Actions or Local Git)
4. ✅ Configure environment variables in Azure
5. ✅ Test deployment

Your repository is now ready for collaborative development and deployment!

