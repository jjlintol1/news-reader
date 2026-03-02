"use strict";

const TOKEN = process.env.THENEWSAPI_TOKEN;

export default async function handler(req, res) {
  if (!TOKEN) {
    return res
      .status(500)
      .json({ error: "THENEWSAPI_TOKEN is not configured" });
  }

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
  console.log(`[api] proxying → ${upstream.toString()}`);

  // Append token after logging so it never appears in logs
  upstream.searchParams.set("api_token", TOKEN);

  const upstreamRes = await fetch(upstream.toString());

  if (!upstreamRes.ok) {
    const body = await upstreamRes.text();
    console.error(`[api] upstream error ${upstreamRes.status}: ${body}`);
    return res.status(upstreamRes.status).json({ error: body });
  }

  const data = await upstreamRes.json();
  return res.json(data);
}
