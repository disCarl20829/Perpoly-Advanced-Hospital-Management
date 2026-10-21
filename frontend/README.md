# PerPoly HMS — Frontend (Prototype)

A React prototype for the Hospital Management System, built so the system can be
demoed while the real frontend is being developed.

The theme is derived from the PerPoly logo (deep blue + green).

## Stack

- **React 18** (JSX)
- **Vite 5** (dev server + build)
- No router / state library — plain React state, kept simple for the prototype

## Run

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies `/api/*` to the Node backend at `http://localhost:3000`,
so the backend must be running for login and data to work.

## Build (production bundle)

```bash
npm run build     # outputs to dist/
npm run preview   # serve the built bundle
```

## Structure

```
frontend/
├── index.html
├── vite.config.js          # dev server + /api proxy
├── public/logo.jpg         # logo used across the app
└── src/
    ├── main.jsx            # entry point
    ├── App.jsx             # auth gate
    ├── api.js              # fetch wrapper (attaches the JWT)
    ├── styles.css          # theme
    ├── auth/AuthContext.jsx
    ├── components/
    │   ├── Login.jsx
    │   └── Layout.jsx      # sidebar + role-based nav
    └── pages/
        ├── Cashier.jsx
        ├── Laboratory.jsx
        ├── Inventory.jsx
        ├── Accounting.jsx
        └── Users.jsx
```

## Demo login

The seed script creates a superadmin:

```
Email:    superadmin@perpoly.local
Password: SuperAdmin123!
```

That account can create cashier / doctor / lab_tech / inventory_staff / accountant
accounts from the **Users** page.
