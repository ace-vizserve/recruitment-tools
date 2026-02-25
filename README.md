# MRF Link Generator

An internal web tool for HFSE that generates platform-specific job application
URLs for the company website (GEG), Indeed, and MyCareersFuture Singapore.

Previously, the recruiter had to contact the developer every time a job link
was needed. This tool eliminates that dependency entirely.

---

## Features

- 🔐 Password-protected login (HTTP-only cookie via Next.js API route)
- 🔗 Generates three job application URLs from a single form submission
- 📋 One-click copy per platform link
- 🕓 Local history of previously generated links (stored in `localStorage`)
- 🗑️ Delete individual history entries or clear all at once
- 🚀 Fully static-friendly — no database required

---

## Platforms Supported

| Platform           | `job-portal` Value |
| ------------------ | ------------------ |
| GEG (company site) | _(omitted)_        |
| Indeed             | `1`                |
| MyCareersFuture    | `2481`             |

---

## Tech Stack

- **Framework** — Next.js (App Router)
- **Auth** — HTTP-only cookie + `/api/login` route
- **Storage** — `localStorage` for link history
- **Hosting** — Vercel (free tier)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
APP_PASSWORD=your_secure_password_here
```

> This is server-side only and never exposed to the client.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## URL Structure

**Base URL:** `https://hfse.edu.sg/submit-application/`

```
# GEG
?job-id={job_id}&org-name={org_name}&job-title={encoded_title}

# Indeed
?job-portal=1&job-id={job_id}&org-name={org_name}&job-title={encoded_title}

# MyCareersFuture
?job-portal=2481&job-id={job_id}&org-name={org_name}&job-title={encoded_title}
```

---

## Project Structure

```
/app
  /login        → Login page
  /api/login    → POST: validate password, set cookie
  /api/logout   → POST: clear cookie
  page.tsx      → Generator + history (protected)
/middleware.ts  → Protects all routes except /login
/lib
  urlEncoder.ts → URL encoding logic
  history.ts    → localStorage helpers
/public
  /logos        → Platform logo assets (geg.png, etc.)
```

---

## Deployment

```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy
```

> Set `APP_PASSWORD` in your Vercel project environment variables.
> Add logo domains to `next.config.js` under `images.domains`.

---

## Notes

- Job titles are URL-encoded to handle spaces, special characters, and em-dashes
- History is stored client-side in `localStorage` — clearing browser data will reset it
- This tool is intended for internal use only
