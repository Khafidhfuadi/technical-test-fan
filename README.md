# Fullstack Technical Test Monorepo

This is a step-by-step fullstack technical test project using a monorepo structure.

## Overview
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Axios
- **Backend**: Express.js, TypeScript, Prisma, Zod, JWT
- **Databases**: PostgreSQL (Main DB), Redis (Caching)
- **Monorepo**: npm workspaces

## Project Structure
```text
/
  /apps
    /frontend
    /backend
  package.json
  docker-compose.yml
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose

### 1. Start Services
First, start the PostgreSQL database and Redis using Docker Compose:
```bash
docker-compose up -d
```

### 2. Environment Variables
Copy the `.env.example` to `.env` in both frontend and backend directories:
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. Install Dependencies
Run npm install from the root folder to install all dependencies for workspaces:
```bash
npm install
```

### 4. Database Setup
Run the Prisma migrations to generate the database schema:
```bash
cd apps/backend
npm run prisma:generate
npx prisma db push
```

### 5. Running the Application
From the root directory, you can start the development servers:

Frontend (http://localhost:3000):
```bash
npm --workspace=frontend run dev
```

Backend (http://localhost:8000):
```bash
npm --workspace=backend run dev
```
