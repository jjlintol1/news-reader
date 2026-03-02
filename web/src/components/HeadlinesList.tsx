/* filepath: web/src/components/HeadlinesList.tsx */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchNews,
  Article,
  NewsApiResponse,
  RateLimitError,
  UsageLimitError,
} from "../lib/newsapi";

const LIMIT = 3;

interface HeadlinesListProps {
  category: string;
  search: string;
  favorites: Article[];
  onToggleFavorite: (article: Article) => void;
  showFavorites: boolean;
  onRateLimit: () => void;
}

type PageCache = Map<number, Article[]>;

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function HeadlinesList({
  category,
  search,
  favorites,
  onToggleFavorite,
  showFavorites,
  onRateLimit,
}: HeadlinesListProps) {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [usageLimited, setUsageLimited] = useState(false);
  const [page, setPage] = useState(1);
  const [totalFound, setTotalFound] = useState(0);
  const [articleIndex, setArticleIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const cacheRef = useRef<PageCache>(new Map());
  const prefetchingRef = useRef<Set<number>>(new Set());

  // Clear error flags when switching to favorites view
  useEffect(() => {
    if (!showFavorites) return;
    setRateLimited(false);
    setUsageLimited(false);
    setError(null);
  }, [showFavorites]);

  // Reset everything when category/search changes
  useEffect(() => {
    if (showFavorites) return;
    cacheRef.current = new Map();
    prefetchingRef.current = new Set();
    setItems([]);
    setPage(1);
    setArticleIndex(0);
    setError(null);
    setRateLimited(false);
    setUsageLimited(false);
    setTotalFound(0);
  }, [category, search, showFavorites]);

  // Load a page (with cache)
  const loadPage = useCallback(
    async (pageNum: number, replace = true) => {
      if (showFavorites) return;

      const cached = cacheRef.current.get(pageNum);
      if (cached) {
        if (replace) {
          setItems(cached);
          setLoading(false);
        }
        return cached;
      }

      if (replace) setLoading(true);
      setError(null);

      try {
        const params: Parameters<typeof fetchNews>[0] = {
          page: pageNum,
          limit: LIMIT,
        };

        // TheNewsAPI does not support search + categories simultaneously — search wins.
        if (search.trim()) {
          params.search = search.trim();
        } else {
          params.categories = category;
        }

        const data: NewsApiResponse = await fetchNews(params);
        const articles = data.data ?? [];

        cacheRef.current.set(pageNum, articles);

        if (replace) {
          setItems(articles);
          setTotalFound(data.meta?.found ?? 0);
          setLoading(false);
        }

        return articles;
      } catch (err: unknown) {
        if (replace) {
          if (err instanceof RateLimitError) {
            setRateLimited(true);
            onRateLimit();
          } else if (err instanceof UsageLimitError) {
            setUsageLimited(true);
            onRateLimit();
          } else {
            setError(err instanceof Error ? err.message : "Unknown error");
          }
          setLoading(false);
        }
      }
    },
    [category, search, showFavorites]
  );

  // Initial load / page change
  useEffect(() => {
    if (showFavorites) return;
    loadPage(page);
  }, [page, loadPage, showFavorites]);

  // Prefetch adjacent pages
  const prefetch = useCallback(
    (pageNum: number) => {
      if (
        pageNum < 1 ||
        cacheRef.current.has(pageNum) ||
        prefetchingRef.current.has(pageNum) ||
        showFavorites
      )
        return;
      prefetchingRef.current.add(pageNum);
      loadPage(pageNum, false).then(() => {
        prefetchingRef.current.delete(pageNum);
      });
    },
    [loadPage, showFavorites]
  );

  // Trigger prefetch when index reaches threshold
  useEffect(() => {
    if (showFavorites) return;
    if (articleIndex === 1) prefetch(page + 1);
    if (articleIndex === 0 && page > 1) prefetch(page - 1);
  }, [articleIndex, page, prefetch, showFavorites]);

  // ---- Pagination helpers ----
  const totalPages = Math.ceil(totalFound / LIMIT);
  const globalArticleNum = (page - 1) * LIMIT + articleIndex + 1;

  function goToArticle(newIndex: number) {
    setImageError(false);
    setArticleIndex(newIndex);
  }

  function goNext() {
    if (articleIndex < items.length - 1) {
      goToArticle(articleIndex + 1);
    } else if (page < totalPages) {
      const nextPage = page + 1;
      const cached = cacheRef.current.get(nextPage);
      if (cached) {
        setItems(cached);
        setPage(nextPage);
        goToArticle(0);
      } else {
        setPage(nextPage);
        goToArticle(0);
      }
    }
  }

  function goPrev() {
    if (articleIndex > 0) {
      goToArticle(articleIndex - 1);
    } else if (page > 1) {
      const prevPage = page - 1;
      const cached = cacheRef.current.get(prevPage);
      if (cached) {
        setItems(cached);
        setPage(prevPage);
        goToArticle(cached.length - 1);
      } else {
        setPage(prevPage);
        goToArticle(0);
      }
    }
  }

  function goFirst() {
    const cached = cacheRef.current.get(1);
    if (cached) {
      setItems(cached);
      setPage(1);
      goToArticle(0);
    } else {
      setPage(1);
      goToArticle(0);
    }
  }

  function goNextPage() {
    if (page >= totalPages) return;
    const nextPage = page + 1;
    const cached = cacheRef.current.get(nextPage);
    if (cached) {
      setItems(cached);
      setPage(nextPage);
      goToArticle(0);
    } else {
      setPage(nextPage);
      goToArticle(0);
    }
  }

  // ---- Render helpers ----
  const displayItems = showFavorites ? favorites : items;
  const currentArticle = displayItems[articleIndex];

  const favIds = new Set(favorites.map((f) => f.uuid));
  const isFav = currentArticle ? favIds.has(currentArticle.uuid) : false;

  // Pager dot labels: show 3 absolute article numbers around current
  function getPagerDots(): number[] {
    const cur = globalArticleNum;
    const totalArt = showFavorites ? favorites.length : totalFound;
    if (totalArt <= 3) return Array.from({ length: totalArt }, (_, i) => i + 1);
    if (cur <= 2) return [1, 2, 3];
    if (cur >= totalArt - 1) return [totalArt - 2, totalArt - 1, totalArt];
    return [cur - 1, cur, cur + 1];
  }

  const pagerDots = getPagerDots();
  const totalArt = showFavorites ? favorites.length : totalFound;

  function goToAbsoluteArticle(absNum: number) {
    const targetPage = Math.ceil(absNum / LIMIT);
    const targetIndex = (absNum - 1) % LIMIT;
    if (showFavorites) {
      goToArticle(absNum - 1);
      return;
    }
    if (targetPage === page) {
      goToArticle(targetIndex);
    } else {
      const cached = cacheRef.current.get(targetPage);
      if (cached) {
        setItems(cached);
        setPage(targetPage);
        goToArticle(targetIndex);
      } else {
        setPage(targetPage);
        setArticleIndex(targetIndex);
      }
    }
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div
        className="card-skeleton"
        aria-busy="true"
        aria-label="Loading article"
      >
        <div className="skeleton-img" />
        <div className="skeleton-text">
          <div className="skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "75%" }} />
        </div>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <div className="rate-limit-box" role="alert">
        <div className="rate-limit-icon">⏱️</div>
        <h2 className="rate-limit-title">Too Many Requests</h2>
        <p className="rate-limit-body">
          You've sent too many requests in the last 60 seconds. Please wait a
          moment before trying again.
        </p>
        {favorites.length > 0 && (
          <button
            className="btn btn-primary rate-limit-cta"
            onClick={onRateLimit}
          >
            ★ View My Favorites ({favorites.length})
          </button>
        )}
        <p className="rate-limit-hint">
          Rate limit resets every 60 seconds ·{" "}
          <a
            href="https://www.thenewsapi.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upgrade plan ↗
          </a>
        </p>
      </div>
    );
  }

  if (usageLimited) {
    return (
      <div className="rate-limit-box" role="alert">
        <div className="rate-limit-icon">🚫</div>
        <h2 className="rate-limit-title">Usage Limit Reached</h2>
        <p className="rate-limit-body">
          Your TheNewsAPI plan quota has been exhausted for this period. No more
          requests can be made until the quota resets.
        </p>
        <p className="rate-limit-body">
          In the meantime, you can still browse any articles you've saved.
        </p>
        {favorites.length > 0 && (
          <button
            className="btn btn-primary rate-limit-cta"
            onClick={onRateLimit}
          >
            ★ View My Favorites ({favorites.length})
          </button>
        )}
        <p className="rate-limit-hint">
          Quota resets on your plan's billing cycle ·{" "}
          <a
            href="https://www.thenewsapi.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upgrade plan ↗
          </a>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box" role="alert">
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!currentArticle) {
    return (
      <div className="empty-box" role="status">
        {showFavorites ? "No favorites saved yet." : "No articles found."}
      </div>
    );
  }

  const imgSrc =
    !imageError && currentArticle.image_url
      ? currentArticle.image_url
      : "/placeholder.svg";

  const hasNext = showFavorites
    ? articleIndex < favorites.length - 1
    : articleIndex < items.length - 1 || page < totalPages;

  const hasPrev = showFavorites
    ? articleIndex > 0
    : articleIndex > 0 || page > 1;

  return (
    <div className="headlines-list">
      {/* Featured Article Card */}
      <article className="article-card" aria-label={currentArticle.title}>
        <div className="card-image-wrap">
          <img
            className="card-image"
            src={imgSrc}
            alt={currentArticle.title}
            onError={() => setImageError(true)}
          />
          <div className="card-overlay">
            <div className="card-meta">
              <span className="card-source">{currentArticle.source}</span>
              <span className="card-date">
                {formatDate(currentArticle.published_at)}
              </span>
            </div>
            <h2 className="card-title">{currentArticle.title}</h2>
            <p className="card-description">
              {currentArticle.description || currentArticle.snippet}
            </p>
            <div className="card-actions">
              <a
                href={currentArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View Full Article ↗
              </a>
              <button
                className={`btn btn-fav${isFav ? " active" : ""}`}
                onClick={() => onToggleFavorite(currentArticle)}
                aria-pressed={isFav}
              >
                {isFav ? "★ Saved" : "☆ Save"}
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Pager */}
      <nav className="pager" aria-label="Article navigation">
        <button
          className="pager-btn"
          onClick={goFirst}
          disabled={articleIndex === 0 && page === 1 && !showFavorites}
          aria-label="First article"
          title="First"
        >
          «
        </button>
        <button
          className="pager-btn"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous article"
          title="Previous"
        >
          ‹
        </button>

        {pagerDots.map((dotNum) => (
          <button
            key={dotNum}
            className={`pager-dot${
              dotNum === (showFavorites ? articleIndex + 1 : globalArticleNum)
                ? " active"
                : ""
            }`}
            onClick={() => goToAbsoluteArticle(dotNum)}
            aria-label={`Article ${dotNum}`}
            aria-current={
              dotNum === (showFavorites ? articleIndex + 1 : globalArticleNum)
                ? "page"
                : undefined
            }
          >
            {dotNum}
          </button>
        ))}

        {totalArt > 3 && (
          <span className="pager-total" aria-live="polite">
            / {totalArt}
          </span>
        )}

        <button
          className="pager-btn"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next article"
          title="Next"
        >
          ›
        </button>
        <button
          className="pager-btn"
          onClick={goNextPage}
          disabled={showFavorites || page >= totalPages}
          aria-label="Next batch of articles"
          title="Next batch (skip 3)"
        >
          »
        </button>
      </nav>
    </div>
  );
}
