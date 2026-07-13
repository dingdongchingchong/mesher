# GiveMeMoney

Create an account, add contacts, and automatically **email** or **text** people asking for money on your behalf.

## What this MVP does

1. **Register / log in** — JWT-backed accounts
2. **Contacts** — store name + email and/or phone
3. **Settings** — reusable message template, target amount, payment link
4. **Ask** — send one request or blast all contacts
5. **Stats + history** — track who you’ve messaged and every request

Without SMTP/Twilio credentials, emails and texts are **logged to the server console** so local development still works.

## Quick start

```bash
cd givememoney
npm install
npm run install:all

cp server/.env.example server/.env

npm run dev
```

- App: http://localhost:5174
- API: http://localhost:3001

## Production

```bash
npm run build
cp server/.env.example server/.env   # set JWT_SECRET + optional SMTP/Twilio
npm start
```

The server serves the built client from `client/dist`.

## Environment

See `server/.env.example`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Auth token secret |
| `SMTP_*` | Email delivery (optional in dev) |
| `TWILIO_*` | SMS delivery (optional in dev) |

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/me` | Profile + settings |
| PUT | `/api/me/settings` | Update template / target / payment link |
| GET | `/api/stats` | Contact / messaged / pending counts |
| GET/POST | `/api/contacts` | List / add contacts |
| DELETE | `/api/contacts/:id` | Remove contact |
| GET/POST | `/api/requests` | History / send one request |
| POST | `/api/requests/send-all` | Blast contacts |

PDF plan aliases also work: `/api/register`, `/api/login`, `/api/send-requests`, `/api/settings`, `/api/stats`.
