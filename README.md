# Khafidh Fuadi — Fullstack Developer Test

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, react-hook-form, Zod, Axios
- Backend: Express.js, TypeScript, Prisma ORM, PostgreSQL, Redis (ioredis), JWT, bcrypt, Nodemailer, Multer, Swagger UI
- Testing: Jest, ts-jest, Supertest
- DevOps: Docker, Docker Compose

## Prerequisites
Sebelum menjalankan project, pastikan sudah terinstall:
- Node.js v18 atau lebih baru
- npm v9 atau lebih baru
- Docker & Docker Compose
- Git

## Setup Instructions

### 1. Clone repository
```bash
git clone {repo_url}
cd khafidhfuadi_fdtest
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Lalu isi nilai berikut di `apps/backend/.env`:
```env
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

Isi di `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Jalankan database dan Redis
```bash
docker-compose up -d
```

### 5. Jalankan database migration
```bash
npm --workspace=backend run prisma:migrate
```

### 6. Jalankan development server
Jalankan backend dan frontend secara bersamaan:
```bash
npm run dev
```

Atau secara terpisah:
```bash
npm --workspace=backend run dev   # http://localhost:8000
npm --workspace=frontend run dev  # http://localhost:3000
```

## API Documentation
Swagger UI tersedia di: http://localhost:8000/api-docs

## Running Tests
```bash
npm --workspace=backend run test
npm --workspace=backend run test:coverage
```

## Database Schema
File schema dump tersedia di: `khafidhfuadi_fdtest_schema.sql`
Untuk restore schema ke database baru:
```bash
psql -U myuser -d mydb -f khafidhfuadi_fdtest_schema.sql
```

## Library Justification
- **Prisma ORM**: type-safe database client, auto-generate types dari schema, mudah migration
- **Zod**: runtime validation yang terintegrasi baik dengan TypeScript, schema reusable
- **Nodemailer**: library email paling mature untuk Node.js, support SMTP
- **ioredis**: Redis client yang robust dengan dukungan TypeScript yang baik
- **Multer**: middleware file upload yang populer dan mudah dikonfigurasi untuk Express
- **react-hook-form**: performa form terbaik di React, uncontrolled components, integrasi Zod mudah
- **JWT (jsonwebtoken)**: stateless auth standard, mudah divalidasi tanpa DB lookup

## Folder Structure
```text
/apps/backend  → Express API server
/apps/frontend → Next.js web app
/khafidhfuadi_fdtest_schema.sql → Database schema dump
```
