# Adhyayan — Student Management Platform

A full-stack student management platform for educational institutions, built with React, Node.js, Express, and MongoDB.

## What it demonstrates

- Role-based workflows for teachers and students
- Authentication and protected API routes
- Attendance management
- Study-note upload and download flows
- Test-score management
- Student profile management
- MongoDB-backed application data
- Production-oriented deployment configuration for Render and Vercel

## Product flow

**Teacher:** sign in → manage attendance → upload notes → record results

**Student:** sign in → view attendance → download notes → check results → manage profile

## Architecture

```text
React client
    │
    ▼
Express / Node.js API
    │
    ├── Authentication middleware
    ├── REST routes
    ├── Mongoose models
    └── File uploads
            │
            ▼
        MongoDB Atlas
```

## Stack

**Frontend:** React, CSS

**Backend:** Node.js, Express, JWT, bcrypt

**Database:** MongoDB, Mongoose

**Infrastructure:** Render / Vercel configuration

## Project structure

```text
Adhyayan/
├── client/           # React application
├── middleware/       # Authentication middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── scripts/          # Database and deployment utilities
├── public/           # Static assets
├── server.js         # API entry point
├── vercel.json
├── render.yaml
└── package.json
```

## Local development

### 1. Install dependencies

```bash
npm install
cd client
npm install
cd ..
```

### 2. Configure environment variables

Create a local `.env` file. Do not commit credentials.

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
PORT=3000
NODE_ENV=development
```

### 3. Start the application

Backend:

```bash
npm start
```

Frontend:

```bash
npm run client
```

Or, when supported by the local environment:

```bash
npm run dev
```

## Production readiness notes

The repository includes deployment configuration and separates environment-specific credentials from source code. Before production use, verify database access controls, secret rotation, CORS origins, upload storage, logging, and HTTPS configuration.

## Security

Never place database passwords, JWT secrets, API keys, or other credentials in `README.md`, source files, or committed environment files. Use `.env` locally and platform-managed environment variables in production.

## Status

Portfolio project demonstrating end-to-end product development for an education use case.

## License

MIT
