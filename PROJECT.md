# Job URL Generator — MRF Links Web App

## Overview

A minimal Next.js web app that replicates the functionality of `generate_mrf_links.sh`.
Instead of running a bash script in a terminal, the recruiter fills out a form in the browser
and gets the three MRF links instantly — ready to copy.
Previously generated links are saved in the browser for reference.

---

## Reference Script: `generate_mrf_links.sh`

The web app must produce identical output to this bash script:

```bash
./generate_mrf_links.sh <org-name> <job-id> "<job-title>"
```

---

## Core Functionality

### Inputs (Form Fields)

| Field     | Type | Maps To     | Example                             |
| --------- | ---- | ----------- | ----------------------------------- |
| Org Name  | text | `org-name`  | `hapi-haus`                         |
| Job ID    | text | `job-id`    | `3091063`                           |
| Job Title | text | `job-title` | `Subject Tuition Teacher – English` |

### URL Encoding Logic

The job title must be URL-encoded before appending to the URL.
Replicate this exact encoding from the bash script:

| Character | Encoded |
| --------- | ------- |
| `%`       | `%25`   |
| Space     | `%20`   |
| `!`       | `%21`   |
| `"`       | `%22`   |
| `'`       | `%27`   |
| `(`       | `%28`   |
| `)`       | `%29`   |
| `,`       | `%2C`   |

> Use JavaScript's `encodeURIComponent()` as the base, then manually handle
> any characters not covered by it to stay consistent with the bash script behavior.

### Generated URLs (Output)

Base URL: `https://hfse.edu.sg/submit-application/`

| Platform  | URL Pattern                                                                                |
| --------- | ------------------------------------------------------------------------------------------ |
| GEG       | `{BASE_URL}?job-id={job_id}&org-name={org_name}&job-title={encoded_title}`                 |
| Indeed    | `{BASE_URL}?job-portal=1&job-id={job_id}&org-name={org_name}&job-title={encoded_title}`    |
| MyCareers | `{BASE_URL}?job-portal=2481&job-id={job_id}&org-name={org_name}&job-title={encoded_title}` |

---

## Auth

- Single password login screen before accessing the generator
- Password stored in `.env.local` as `APP_PASSWORD` (server-side, not exposed to client)
- Login handled via a **Next.js API route** (`/api/login`):
  - Receives password from the login form via POST request
  - Compares against `APP_PASSWORD` on the server
  - On success, sets an **HTTP-only cookie** (`auth_session`) with a secure token
- All protected pages check for the valid cookie via **Next.js middleware** (`middleware.ts`)
- Unauthenticated requests are redirected to `/login`
- Logout clears the cookie

---

## History (localStorage)

- Every time URLs are successfully generated, save the entry to `localStorage`
- Each history entry stores:
  - `org-name`
  - `job-id`
  - `job-title`
  - Generated URLs (GEG, Indeed, MyCareers)
  - Timestamp
- Display history as a list below the generator form
- Each history entry has:
  - A **Copy** button per URL
  - A **Delete** button to remove that entry
- History persists across sessions until manually cleared

---

## UI Behavior

- Password login page (`/login`) — redirects to `/` on success
- Generator page (`/`) — protected, redirects to `/login` if no valid cookie
- Three input fields: Org Name, Job ID, Job Title
- A **Generate** button that triggers URL construction
- Output section displays all three URLs labeled: **GEG**, **Indeed**, **MyCareers**
- Each generated URL has a **Copy** button
- History section below showing previously generated entries from localStorage

---

## Tech Stack

| Layer      | Solution                     | Cost |
| ---------- | ---------------------------- | ---- |
| Framework  | Next.js (App Router)         | Free |
| Auth       | HTTP-only cookie + API route | Free |
| Storage    | localStorage (history)       | Free |
| Hosting    | Vercel                       | Free |
| Backend/DB | None                         | Free |

---

## Environment Variables

```
# .env.local (server-side only, never exposed to client)
APP_PASSWORD=your_secure_password_here
```

---

## Project Structure

```
/app
  /login
    page.tsx          # Login form
  /api
    /login
      route.ts        # POST: validate password, set cookie
    /logout
      route.ts        # POST: clear cookie
  page.tsx            # Generator + history (protected)
  layout.tsx
/middleware.ts         # Protects all routes except /login
/lib
  urlEncoder.ts       # URL encoding logic (mirrors bash script)
  history.ts          # localStorage read/write helpers
```

---

## Deployment

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

> Set `APP_PASSWORD` in Vercel environment variables (not exposed to client).

---

## Project Scope

Intentionally minimal. No database, no external auth service.
The goal is a fast, free, browser-based version of the bash script
for a single non-technical user (the recruiter), with a local history
of previously generated links for convenience.
