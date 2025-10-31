# Azure App Service Deployment Guide

This guide explains how to deploy this Next.js application to Azure App Service using Local Git deployment.

## Prerequisites

1. Azure App Service configured with Local Git deployment
2. Git installed on your local machine
3. Azure CLI (optional, for managing app settings)

## Deployment Files

The following files have been created for Azure deployment:

- `.deployment` - Configures Azure to build during deployment
- `startup.sh` - Startup script for the Next.js standalone build
- `package.json` - Updated start script to work with Azure's PORT environment variable

## Environment Variables

Before deploying, make sure to set the following environment variables in Azure App Service:

### Required Environment Variables:

1. **Cosmos DB:**
   - `COSMOS_ENDPOINT` - Your Azure Cosmos DB endpoint
   - `COSMOS_KEY` - Your Azure Cosmos DB primary key

2. **Firebase Admin (choose one method):**
   
   Option A - Inline credentials:
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_CLIENT_EMAIL` - Firebase service account email
   - `FIREBASE_PRIVATE_KEY` - Firebase service account private key (with `\n` preserved)

   Option B - Application Default Credentials:
   - `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file

### Setting Environment Variables in Azure:

**Using Azure Portal:**
1. Go to your App Service in Azure Portal
2. Navigate to **Configuration** > **Application settings**
3. Click **+ New application setting** for each variable
4. Save the changes

**Using Azure CLI:**
```bash
az webapp config appsettings set --name <app-name> --resource-group <resource-group> --settings \
  COSMOS_ENDPOINT="your-endpoint" \
  COSMOS_KEY="your-key" \
  FIREBASE_PROJECT_ID="your-project-id" \
  FIREBASE_CLIENT_EMAIL="your-email" \
  FIREBASE_PRIVATE_KEY="your-private-key"
```

## Azure App Service Configuration

### 1. Configure Startup Command

In Azure Portal:
1. Go to your App Service
2. Navigate to **Configuration** > **General settings**
3. Set **Startup Command** to:
   ```
   bash startup.sh
   ```

### 2. Set Node Version (if needed)

In Azure Portal:
1. Go to **Configuration** > **General settings**
2. Set **Stack** to `Node.js`
3. Set **Node version** to `18 LTS` or `20 LTS`

## Deployment Steps

### 1. Commit your changes

```bash
git add .
git commit -m "Add Azure deployment configuration"
```

### 2. Push to Azure

```bash
git push azure master
```

If you haven't set up the remote yet:
```bash
git remote add azure https://servair-webapp-gde7dgdye2dnasgt.scm.francecentral-01.azurewebsites.net:443/servair-webapp.git
git push azure master
```

### 3. Monitor Deployment

After pushing, Azure will:
1. Install dependencies (`npm install`)
2. Build the application (`npm run build`)
3. Start the application using `startup.sh`

You can monitor the deployment logs in:
- Azure Portal > App Service > **Deployment Center** > **Logs**
- Or via Kudu: `https://<app-name>.scm.azurewebsites.net`

## Troubleshooting

### Build Fails

- Check the deployment logs in Azure Portal
- Verify all dependencies are in `package.json` (not just `devDependencies`)
- Ensure Node.js version is compatible (14+)

### Application Won't Start

- Verify environment variables are set correctly
- Check startup logs: Azure Portal > App Service > **Log stream**
- Ensure PORT environment variable is available (Azure sets this automatically)

### Standalone Build Issues

- Verify `next.config.js` has `output: 'standalone'`
- Check that the build completes successfully
- Review build logs for any errors

### Environment Variable Issues

- Ensure Firebase private key has `\n` characters preserved (escape them as `\\n` in Azure Portal)
- Verify Cosmos DB credentials are correct
- Check that all required variables are set

## Additional Notes

- The app uses Next.js standalone output mode for optimized Azure deployment
- The startup script automatically detects if a standalone build exists
- Port configuration is handled automatically by Azure (via PORT environment variable)
- Make sure your `.env.local` file is NOT committed (it's in `.gitignore`)

## Next Steps

After successful deployment:
1. Test your API endpoints
2. Verify database connections
3. Monitor application logs
4. Set up continuous deployment if needed

