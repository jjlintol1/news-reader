/* filepath: web/src/App.tsx */
import { useState, useEffect, useCallback } from "react";
import HeadlinesList from "./components/HeadlinesList";
import { Article } from "./lib/newsapi";

const CATEGORIES = [
  "tech",
  "general",
  "science",
  "sports",
  "business",
  "health",
  "entertainment",
  "politics",
  "food",
  "travel",
];

const FAVORITES_KEY = "news-reader-favorites";

function loadFavorites(): Article[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Article[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: Article[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    // quota exceeded — silent fail
  }
}

export default function App() {
  const [category, setCategory] = useState("tech");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Article[]>(loadFavorites);
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const handleToggleFavorite = useCallback((article: Article) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.uuid === article.uuid);
      return exists
        ? prev.filter((f) => f.uuid !== article.uuid)
        : [article, ...prev];
    });
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setCategory("tech");
    setShowFavorites(false);
  }

  function handleCategoryClick(cat: string) {
    setCategory(cat);
    setSearch("");
    setSearchInput("");
    setShowFavorites(false);
  }

  function handleShowFavorites() {
    setShowFavorites(true);
  }

  function handleHideFavorites() {
    setShowFavorites(false);
  }

  return (
    <div className="app-layout">
      {/* ===== Header ===== */}
      <header className="app-header">
        <div className="header-inner">
          <span className="app-logo">📰</span>
          <h1 className="app-title">News Reader</h1>
          <button
            className="filter-toggle btn btn-ghost"
            onClick={() => setFiltersVisible((v) => !v)}
            aria-expanded={filtersVisible}
            aria-controls="sidebar"
          >
            {filtersVisible ? "Hide Filters ✕" : "Show Filters ☰"}
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* ===== Sidebar ===== */}
        <aside
          id="sidebar"
          className={`sidebar${filtersVisible ? " sidebar--open" : ""}`}
          aria-label="Filters"
        >
          {/* Search */}
          <form
            className="search-form"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <label htmlFor="search-input" className="sr-only">
              Search articles
            </label>
            <input
              id="search-input"
              className="search-input"
              type="search"
              placeholder="Search articles…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-search"
              aria-label="Search"
            >
              🔍
            </button>
          </form>

          {/* Category list */}
          <nav aria-label="Categories">
            <p className="sidebar-label">Categories</p>
            <ul className="category-list" role="list">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    className={`category-btn${
                      !showFavorites && category === cat && !search
                        ? " active"
                        : ""
                    }`}
                    onClick={() => handleCategoryClick(cat)}
                    aria-current={
                      !showFavorites && category === cat && !search
                        ? "true"
                        : undefined
                    }
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Favorites toggle */}
          <div className="sidebar-footer">
            {showFavorites ? (
              <button
                className="btn btn-fav-view active"
                onClick={handleHideFavorites}
              >
                ← Back to Live News
              </button>
            ) : (
              <button
                className="btn btn-fav-view"
                onClick={handleShowFavorites}
              >
                ★ Favorites ({favorites.length})
              </button>
            )}
          </div>
        </aside>

        {/* ===== Main content ===== */}
        <main className="main-content" aria-live="polite">
          {showFavorites && (
            <div className="view-label" role="status">
              Showing saved favorites
            </div>
          )}
          {!showFavorites && (search || category) && (
            <div className="view-label" role="status">
              {search ? (
                <>
                  Search results for: <strong>"{search}"</strong>
                </>
              ) : (
                <>
                  Category: <strong>{category}</strong>
                </>
              )}
            </div>
          )}
          <HeadlinesList
            category={category}
            search={showFavorites ? "" : search}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            showFavorites={showFavorites}
            onRateLimit={handleShowFavorites}
          />
        </main>
      </div>
    </div>
  );
}
