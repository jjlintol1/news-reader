# news-reader — Express Proxy

Lightweight Express server that sits between the browser and [TheNewsApi](https://www.thenewsapi.com/).  
The API token **never** leaves this process.

## Setup

```bash
cp .env.example .env
# Edit .env and set THENEWSAPI_TOKEN=<your real token>
npm install
npm run dev   # starts on http://localhost:5177
```

## Routes

| Method | Path            | Description             |
| ------ | --------------- | ----------------------- |
| GET    | `/api/health`   | Liveness check          |
| GET    | `/api/news/all` | Proxy to `/v1/news/all` |

### Supported query params for `/api/news/all`

| Param        | Notes                                                   |
| ------------ | ------------------------------------------------------- |
| `page`       | Page number (int)                                       |
| `limit`      | Results per page (default `3`)                          |
| `categories` | Comma-separated list                                    |
| `search`     | Free-text search (mutually exclusive with `categories`) |

`language` is always forced to `en` by the proxy.
