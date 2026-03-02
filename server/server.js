/* filepath: server/server.js */
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5177;
const TOKEN = process.env.THENEWSAPI_TOKEN;

if (!TOKEN) {
  console.error("[server] THENEWSAPI_TOKEN is not set. Please configure .env");
  process.exit(1);
}

app.use(cors({ origin: ["http://localhost:5176", "http://127.0.0.1:5176"] }));
app.use(express.json());

/* ------------------------------------------------------------------ */
/* Health check                                                          */
/* ------------------------------------------------------------------ */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* ------------------------------------------------------------------ */
/* News proxy — /api/news/all                                           */
/* ------------------------------------------------------------------ */
app.get("/api/news/all", async (req, res) => {
  try {
    const { page, categories, search, limit } = req.query;

    const upstream = new URL("https://api.thenewsapi.com/v1/news/all");
    upstream.searchParams.set("language", "en");
    upstream.searchParams.set("limit", limit || "3");

    if (page) upstream.searchParams.set("page", page);

    // TheNewsAPI does not support search + categories simultaneously.
    // search takes priority; categories only when no search term present.
    // For category browsing, sort by recency. For search, let the API use
    // its default relevance_score ranking for better result quality.
    if (search && String(search).trim()) {
      upstream.searchParams.set("search", String(search).trim());
    } else {
      upstream.searchParams.set("sort", "published_at");
      if (categories) upstream.searchParams.set("categories", categories);
    }

    // Log the proxied URL *without* the token for debugging
    const debugUrl = upstream.toString();
    console.log(`[server] proxying → ${debugUrl}`);

    // Append token after logging so it never appears in logs
    upstream.searchParams.set("api_token", TOKEN);

    const upstreamRes = await fetch(upstream.toString());

    if (!upstreamRes.ok) {
      const body = await upstreamRes.text();
      console.error(`[server] upstream error ${upstreamRes.status}: ${body}`);
      return res.status(upstreamRes.status).json({ error: body });
    }

    const data = await upstreamRes.json();
    return res.json(data);
  } catch (err) {
    console.error("[server] unexpected error:", err.message);
    return res.status(500).json({ error: "Internal proxy error" });
  }
});

app.listen(PORT, () => {
  console.log(`[server] news-reader proxy running on http://localhost:${PORT}`);
});
