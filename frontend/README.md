# MHP Frontend

React + Vite SPA for Meal Headcount Planner.

## Dev

```bash
npm install
npm run dev    # starts on http://localhost:5173
```

Requires the backend running on `http://localhost:3000`. All `/api` requests are proxied automatically.

## Production build

```bash
npm run build  # outputs to dist/
```

Copy `dist/` to `backend/public/` — Express serves it alongside the API.
