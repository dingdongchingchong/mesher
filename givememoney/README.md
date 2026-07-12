# GiveMeMoney 💸

Create an account, add contacts, and automatically **email** or **text** people asking for money on your behalf.

## Features

- **Account creation** — register with email and password
- **Contacts** — save people with email and/or phone number
- **Money requests** — set amount, custom message, optional payment link (Venmo, PayPal, etc.)
- **Email** — sends formatted HTML emails via SMTP
- **SMS** — sends text messages via Twilio
- **History** — track all sent requests

Without SMTP/Twilio credentials, emails and texts are **logged to the server console** so you can develop locally.

## Quick start

```bash
cd givememoney
npm install
npm run install:all

# Copy env and optionally add SMTP/Twilio keys
cp server/.env.example server/.env

npm run dev
```

- Frontend: http://localhost:5174
- API: http://localhost:3001

## Production

```bash
npm run build
cd server && cp .env.example .env   # configure secrets
npm run start --prefix ..
```

The server serves the built client from `client/dist`.

## Environment variables

See `server/.env.example`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for auth tokens |
| `SMTP_*` | Email delivery (optional in dev) |
| `TWILIO_*` | SMS delivery (optional in dev) |

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts` | Add contact |
| POST | `/api/requests` | Send money request |
| GET | `/api/requests` | Request history |
