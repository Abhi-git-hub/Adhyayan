# Security Policy

## Supported configuration

The application expects authentication and database credentials to be supplied through environment variables. Do not commit `.env` files, API keys, database connection strings, JWT secrets, session secrets, or private certificates.

Production requires:

- `MONGODB_URI`
- `JWT_SECRET` (minimum 32 characters)
- `SESSION_SECRET` (minimum 32 characters)
- `FRONTEND_URL`

## Authentication

API authentication uses short-lived JWTs signed with HS256 and validated with an explicit issuer and audience. Tokens must be supplied in the `Authorization: Bearer <token>` header; query-string and request-body tokens are not accepted.

Passwords are stored with bcrypt. Legacy plaintext passwords are migrated to bcrypt after a successful login, so existing users should be moved off legacy credentials promptly.

## Reporting a vulnerability

Please do not publish credentials, exploit details, or sensitive user data in a public issue. Rotate any credential that may have been exposed and report the issue privately to the repository owner.
