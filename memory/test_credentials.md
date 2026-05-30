# Questing Academy — Test Credentials

This is a **frontend-only prototype**. There is no real auth, no real database, and no real backend.
Both PINs below are hard-coded in the frontend source for prototype/demo purposes only.

## Parent Dashboard
- URL: `/parent`
- PIN: **1234**
- Source: `/app/frontend/src/pages/Parent.tsx` (`const PIN = "1234"`)

## Admin Dashboard
- URL: `/admin`
- PIN: **2580**
- Source: `/app/frontend/src/pages/AdminDashboard.tsx` (`const ADMIN_PIN = "2580"`)

## Notes
- All gameplay state is in `localStorage` under key `questing-academy-state-v1`.
- To reset everything: open `/admin` → Danger Zone → "Reset entire account", **or** in browser console run `localStorage.clear()`.
- No user accounts, no signups, no API keys required.
