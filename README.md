# Adhyayan — Student Management Platform

Adhyayan is a full-stack student management platform for coaching and educational institutions. It provides separate teacher and student workflows for attendance, notes, test results, profiles, and batch-based access control.

## What it demonstrates

- Teacher and student authentication
- Role-based authorization and batch-level access control
- Attendance management
- Secure study-note upload and download flows
- Test-score management
- Student and teacher profile management
- MongoDB-backed application data
- Production-oriented configuration and health checks

## Product flow

**Teacher:** sign in → manage assigned batches → mark attendance → publish notes → record results

**Student:** sign in → view personal attendance → access batch notes → review results → manage profile

## Architecture

```text
Browser / frontend build
          │
          ▼
   Express / Node.js
          │
    ┌─────┼───────────────┐
    ▼     ▼               ▼
   Auth  REST API       File access
    │     │               │
    │     ├─ Students     └─ Authorization checks
    │     ├─ Teachers
    │     ├─ Attendance
    │     ├─ Notes
    │     └─ Test scores
    │
    ▼
 JWT + session compatibility
          │
          ▼
      MongoDB
```

## Security hardening

The current branch includes:

- JWT verification restricted to `Authorization: Bearer <token>`
- Explicit JWT issuer, audience, and algorithm validation
- No fallback production JWT/session secrets
- Bcrypt password hashing with automatic migration of legacy plaintext records after successful login
- Login rate limiting
- Strict production environment validation
- Restricted CORS configuration
- Secure HTTP response headers and HSTS in production
- Private note-file access checks
- Development-only debug routes
- Request-body size limits
- Generic production error responses that avoid returning internal details

See [`SECURITY.md`](SECURITY.md) for deployment and credential guidance.

## Repository layout

```text
Adhyayan/
├── build/            # Compiled frontend served by the Express application
├── controllers/      # Domain controllers
├── middleware/       # Authentication and authorization middleware
├── models/           # Mongoose models
├── routes/           # REST API routes
├── scripts/          # Database/setup utilities
├── public/           # Static server assets
├── views/            # Legacy server-rendered views
├── server.js         # Application entry point
├── build-client.js   # Verifies the shipped frontend build
├── .env.example      # Safe local configuration template
├── SECURITY.md
└── package.json
```

> The current public branch ships the frontend as a compiled `build/` artifact. It does not contain the original React `client/` source tree, so the build script verifies the shipped artifact rather than pretending to compile a missing source directory.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and replace the placeholder secrets.

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/adhyayan
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-long-random-session-secret
FRONTEND_URL=http://localhost:3000
```

Never commit `.env` or real credentials.

### 3. Start the application

```bash
npm start
```

The API is available on the configured port. The root frontend build is served automatically when `build/index.html` is present.

### 4. Verify the application

```bash
npm test
npm run build
```

`npm test` performs a Node syntax check for the application entry point. `npm run build` verifies that the committed frontend artifact is present.

## Authentication contract

API requests that require authentication must use:

```http
Authorization: Bearer <jwt>
```

The server does not accept access tokens through query parameters or request bodies.

## Database utilities

```bash
npm run init-db
npm run populate-db
npm run check-db
```

Review imported data before running population utilities against a production database because the population script intentionally replaces existing student and teacher records.

## Production notes

Set the required environment variables through the hosting provider's secret manager. Do not copy production credentials into the repository.

The application now refuses to start in production when required secrets are missing or too short, and `/api/health` reports database health accurately.

## Status

Hardened portfolio project demonstrating end-to-end product development, authentication, authorization, data modeling, file handling, and deployment-oriented backend engineering.

## License

MIT
