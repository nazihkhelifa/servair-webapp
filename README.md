# Servair Web Application

Fleet management web application built with Next.js 14, TypeScript, and Azure Cosmos DB.

## Features

- **Fleet Management**: Track trucks, drivers, and assignments
- **Flight Management**: Manage flight schedules and assignments
- **Real-time Tracking**: GPS tracking and monitoring
- **Analytics Dashboard**: View fleet analytics and metrics
- **Route Planning**: Optimize truck routes and ETAs

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Database**: Azure Cosmos DB
- **Maps**: Leaflet with React-Leaflet
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or yarn
- Azure Cosmos DB account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd servair-webapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with the following variables:

```env
# Azure Cosmos DB
COSMOS_ENDPOINT=your-cosmos-endpoint
COSMOS_KEY=your-cosmos-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This application is configured for Azure App Service deployment. See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Azure

1. Ensure Azure App Service is configured with Local Git deployment
2. Set environment variables in Azure Portal
3. Push to Azure:
```bash
git push azure master
```

## Project Structure

```
servair-webapp/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   └── ...                # Other pages
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── cosmosDb.ts       # Cosmos DB client
│   └── ...               # Other utilities
├── public/               # Static assets
├── scripts/              # Migration scripts
└── types/               # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate:locations` - Migrate locations from Firestore to Cosmos DB
- `npm run migrate:all` - Run all migration scripts

## Environment Variables

See the [Getting Started](#getting-started) section for required environment variables.

## License

Private repository - All rights reserved

