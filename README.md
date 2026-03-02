# 📰 News Reader

A Flipboard-style news reader built with a **React + TypeScript + Vite** frontend and a lightweight proxy backend. Browse headlines by category, search for topics, and save your favourite articles — all without exposing your API token to the browser.

> **Live demo:** deployed on [Vercel](https://vercel.com) — the frontend is served as a static site and the news proxy runs as a Vercel Serverless Function.

---

## Features

- 🗂 **Category browsing** — tech, general, science, sports, business, health, entertainment, politics, food, travel
- 🔍 **Full-text search** — search across all articles in real-time
- ⭐ **Favourites** — bookmark articles; persisted in `localStorage`
- 🔒 **Secure API proxy** — the TheNewsAPI token lives only on the server and is never sent to the browser
- 📱 **Responsive layout** — collapsible sidebar with a "Show Filters" toggle for narrow screens

---

## Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite                          |
| Backend (dev) | Node.js, Express, node-fetch, dotenv, CORS     |
| Backend (prod) | Vercel Serverless Function (`api/news/all.js`) |
| News API | [TheNewsAPI](https://www.thenewsapi.com/)           |

---

## Project Structure

```
news-reader/
├── api/
│   └── news/
│       └── all.js      # Vercel Serverless Function (production proxy)
├── web/                # React + Vite frontend (port 5176)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── server/             # Express proxy backend (local dev, port 5177)
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── vercel.json         # Vercel build + routing configuration
└── package.json        # Root — runs both services with `concurrently`
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A free API token from [TheNewsAPI](https://www.thenewsapi.com/)

### 1. Clone the repository

```bash
git clone https://github.com/jjlintol1/news-reader.git
cd news-reader
```

### 2. Configure the backend

```bash
cd server
cp .env.example .env
# Open .env and set THENEWSAPI_TOKEN=<your_token>
cd ..
```

### 3. Install dependencies

```bash
# Root devDependencies (concurrently)
npm install

# Server dependencies
npm run server:install

# Web dependencies
cd web && npm install && cd ..
```

### 4. Start the development servers

```bash
npm run dev
```

This runs both services in parallel:

| Service  | URL                      |
| -------- | ------------------------ |
| Frontend | http://localhost:5176    |
| Backend  | http://localhost:5177    |

Open **http://localhost:5176** in your browser.

---

## Available Scripts

Run these from the **project root**:

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start frontend + backend simultaneously  |
| `npm run web:dev`      | Start only the Vite frontend             |
| `npm run server:dev`   | Start only the Express proxy             |
| `npm run server:install` | Install server-side dependencies       |

---

## Deploying to Vercel

The project ships with a `vercel.json` that configures everything automatically.

### How it works on Vercel

| Concern      | Solution                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | Built with `vite build`, served from `web/dist` as a static site        |
| API proxy    | `api/news/all.js` is deployed as a Vercel Serverless Function            |
| API token    | Set as an environment variable in the Vercel dashboard — never in code   |

### Deploy steps

1. **Import** the repository into [Vercel](https://vercel.com/new).
2. In the Vercel dashboard, go to **Settings → Environment Variables** and add:

   | Name                 | Value                        |
   | -------------------- | ---------------------------- |
   | `THENEWSAPI_TOKEN`   | Your TheNewsAPI bearer token |

3. Click **Deploy**. Vercel reads `vercel.json` and handles the rest.

> The `vercel.json` configuration in this project:
> ```json
> {
>   "buildCommand": "cd web && npm install && npm run build",
>   "outputDirectory": "web/dist",
>   "installCommand": "echo 'skip root install'"
> }
> ```

---

## API Proxy Routes

The proxy (Express locally, Vercel Serverless Function in production) exposes the following routes (see `server/README.md` for full local-dev details):

| Method | Path              | Description                        |
| ------ | ----------------- | ---------------------------------- |
| GET    | `/api/health`     | Liveness check                     |
| GET    | `/api/news/all`   | Proxied news feed from TheNewsAPI  |

### Query Parameters for `/api/news/all`

| Parameter    | Description                                               |
| ------------ | --------------------------------------------------------- |
| `page`       | Page number (integer)                                     |
| `limit`      | Results per page (default: `3`)                           |
| `categories` | Comma-separated category list                             |
| `search`     | Free-text search (mutually exclusive with `categories`)   |

> `language` is always forced to `en` by the proxy.

---

## Environment Variables

**Local development** — create `server/.env` (use `server/.env.example` as a template):

| Variable             | Required | Description                            |
| -------------------- | -------- | -------------------------------------- |
| `THENEWSAPI_TOKEN`   | ✅ Yes   | Your TheNewsAPI bearer token           |
| `PORT`               | ❌ No    | Proxy server port (default: `5177`)    |

**Vercel production** — set `THENEWSAPI_TOKEN` in the Vercel dashboard under **Settings → Environment Variables**. The `PORT` variable is not used on Vercel.

> **Never** commit your `.env` file or expose your API token publicly.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feat/your-feature`
5. Open a Pull Request

---

## License

This project is open source. See the repository for license details.
