# Halalich Vendor Web App

Desktop vendor dashboard with the same Laravel + Firebase behavior as the Android vendor app.

## Scripts

```bash
cp .env.example .env
npm install
npm run dev
npm test
npm run build
```

Sign in with an existing vendor Firebase email/password. Vendor ID is the Firebase Auth UID.

## Features

- Dashboard pending orders (pickup vs delivery)
- Order lifecycle: accept / reject / ready / delivered / out for delivery
- Products, stock, categories (max 5, unique names)
- Earnings from delivered orders (`vendor_cart_total` with `cart_total` fallback)
- Profile + logout
- New-order RTDB alerts with sound
- Browser print of vendor + customer receipts
