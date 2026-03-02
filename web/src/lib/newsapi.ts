/* filepath: web/src/lib/newsapi.ts */

/** Thrown when the API returns HTTP 429 (too many requests in 60 s). */
export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

/** Thrown when the API returns HTTP 402 (monthly/daily plan quota exhausted). */
export class UsageLimitError extends Error {
  constructor() {
    super("API usage limit reached. Your plan quota has been exhausted.");
    this.name = "UsageLimitError";
  }
}

export interface Article {
  uuid: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  published_at: string;
  source: string;
  categories: string[];
  snippet: string;
}

export interface NewsApiResponse {
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
  data: Article[];
}

export interface FetchNewsParams {
  page?: number;
  categories?: string;
  search?: string;
  limit?: number;
}

export async function fetchNews(
  params: FetchNewsParams
): Promise<NewsApiResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  if (params.search && params.search.trim()) {
    qs.set("search", params.search.trim());
  } else if (params.categories) {
    qs.set("categories", params.categories);
  }

  const url = `/api/news/all?${qs.toString()}`;
  console.log("[client] fetching →", url);

  const res = await fetch(url);

  if (res.status === 429) {
    throw new RateLimitError();
  }
  if (res.status === 402) {
    throw new UsageLimitError();
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("TheNewsApi authentication failed. Check your API token.");
  }
  if (!res.ok) {
    throw new Error(`Unexpected error: ${res.status}`);
  }

  return res.json() as Promise<NewsApiResponse>;
}
