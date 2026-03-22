import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useCategories, useInfiniteGigs } from "@/api/hooks";
import GigCard from "@/components/gig/GigCard";
import { GigCardSkeleton } from "@/components/ui/Skeleton";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { ref, inView } = useInView();

  const category = categories?.find(c => c.slug === slug);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteGigs(
    category ? { category_id: category.id } : undefined
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  const allGigs = data?.pages.flatMap(p => p.items) || [];

  return (
    <div>
      <div className="px-4 pt-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading text-xl font-bold">
          {category?.emoji} {category?.name || "Категория"}
        </h1>
      </div>

      {category && (
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
          {category.subcategories.map(sub => (
            <button key={sub.id} className="flex-shrink-0 px-3 py-1.5 bg-tg-secondary-bg rounded-full text-xs text-tg-text">
              {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 grid grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)
          : allGigs.map(gig => (
              <div key={gig.id} className="flex justify-center">
                <GigCard gig={gig} />
              </div>
            ))}
      </div>

      <div ref={ref} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
