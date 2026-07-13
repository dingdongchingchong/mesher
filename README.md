# mesher

Monorepo containing product MVPs.

## GiveMeMoney

See [`givememoney/README.md`](./givememoney/README.md).

Create an account, add contacts, and automatically email or text people asking for money on your behalf.

```bash
cd givememoney
npm install && npm run install:all
cp server/.env.example server/.env
npm run dev
```

On **Termux (Android)**, use `npm run install:termux` instead of `install:all` (see [`givememoney/README.md`](./givememoney/README.md#termux-android)).

## Accounting app

See [`app/README.md`](./app/README.md) for the desktop cash-basis accounting MVP.
