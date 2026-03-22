import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { useInfiniteSearch, useCategories } from "@/api/hooks";
import GigCard from "@/components/gig/GigCard";
import { GigCardSkeleton } from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import { saveSearchHistory, getSearchHistory } from "@/utils";
import { useInView } from "react-intersection-observer";

const SORT_OPTIONS = [
  { value: "popular", label: "Популярные" },
  { value: "rating", label: "По рейтингу" },
  { value: "price_asc", label: "Цена ↑" },
  { value: "price_desc", label: "Цена ↓" },
  { value: "newest", label: "Новые" },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(params.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory());

  // Filters
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [delivery, setDelivery] = useState<number | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [sort, setSort] = useState(params.get("sort") || "popular");

  const { ref: loadMoreRef, inView } = useInView();

  const { data: categories } = useCategories();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchParams = {
    q: debouncedQuery || undefined,
    category_id: categoryId,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    delivery: delivery,
    rating: minRating,
    sort,
    size: 20,
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteSearch(debouncedQuery || categoryId ? searchParams : undefined);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allGigs = data?.pages.flatMap(p => p.items) || [];

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim()) {
      saveSearchHistory(q);
      setHistory(getSearchHistory());
    }
  };

  const clearFilters = () => {
    setCategoryId(undefined);
    setMinPrice("");
    setMaxPrice("");
    setDelivery(undefined);
    setMinRating(undefined);
    setSort("popular");
  };

  const hasActiveFilters = categoryId || minPrice || maxPrice || delivery || minRating || sort !== "popular";

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-tg-bg z-10">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-tg-secondary-bg rounded-2xl px-4 py-2.5">
            <SearchIcon size={18} className="text-tg-hint" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-tg-text placeholder:text-tg-hint outline-none text-sm"
              placeholder="Поиск услуг..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={16} className="text-tg-hint" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`p-2.5 rounded-xl ${hasActiveFilters ? "bg-accent text-white" : "bg-tg-secondary-bg text-tg-text"}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Sort pills */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === opt.value
                  ? "bg-accent text-white"
                  : "bg-tg-secondary-bg text-tg-hint"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search history */}
      {!debouncedQuery && history.length > 0 && (
        <div className="px-4 py-2">
          <p className="text-xs text-tg-hint mb-2">Недавние поиски</p>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <button
                key={h}
                onClick={() => setQuery(h)}
                className="px-3 py-1.5 bg-tg-secondary-bg rounded-full text-xs text-tg-text"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 mt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)}
          </div>
        ) : allGigs.length === 0 && debouncedQuery ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-tg-text">Ничего не найдено</p>
            <p className="text-sm text-tg-hint mt-1">Попробуйте другой запрос или уберите фильтры</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-accent text-sm underline">
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <>
            {debouncedQuery && (
              <p className="text-xs text-tg-hint mb-3">
                {data?.pages[0]?.total || 0} результатов по запросу «{debouncedQuery}»
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {allGigs.map((gig) => (
                <div key={gig.id} className="flex justify-center">
                  <GigCard gig={gig} />
                </div>
              ))}
            </div>
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Фильтры"
      >
        <div className="px-4 space-y-5 pb-6">
          {/* Category */}
          <div>
            <label className="text-sm font-semibold text-tg-text block mb-2">Категория</label>
            <select
              value={categoryId || ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-tg-secondary-bg rounded-xl px-4 py-3 text-sm text-tg-text outline-none"
            >
              <option value="">Все категории</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div>
            <label className="text-sm font-semibold text-tg-text block mb-2">Цена, ₽</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="от"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="flex-1 bg-tg-secondary-bg rounded-xl px-4 py-3 text-sm text-tg-text outline-none"
              />
              <input
                type="number"
                placeholder="до"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="flex-1 bg-tg-secondary-bg rounded-xl px-4 py-3 text-sm text-tg-text outline-none"
              />
            </div>
          </div>

          {/* Delivery */}
          <div>
            <label className="text-sm font-semibold text-tg-text block mb-2">Срок</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 7, undefined].map((d) => (
                <button
                  key={d ?? "any"}
                  onClick={() => setDelivery(d)}
                  className={`px-3 py-2 rounded-xl text-sm ${
                    delivery === d ? "bg-accent text-white" : "bg-tg-secondary-bg text-tg-text"
                  }`}
                >
                  {d ? `до ${d} дн` : "Любой"}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-sm font-semibold text-tg-text block mb-2">Рейтинг</label>
            <div className="flex gap-2">
              {[undefined, 4, 4.5, 5].map((r) => (
                <button
                  key={r ?? "any"}
                  onClick={() => setMinRating(r)}
                  className={`px-3 py-2 rounded-xl text-sm ${
                    minRating === r ? "bg-accent text-white" : "bg-tg-secondary-bg text-tg-text"
                  }`}
                >
                  {r ? `${r}+` : "Любой"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { clearFilters(); setShowFilters(false); }}
            className="w-full py-3 text-sm text-danger border border-danger/30 rounded-xl"
          >
            Сбросить все
          </button>

          <button
            onClick={() => setShowFilters(false)}
            className="w-full btn-primary"
          >
            Применить
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
