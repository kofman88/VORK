import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, Bell } from "lucide-react";
import { useCategories, useFeaturedGigs, useGigs, useNotifications } from "@/api/hooks";
import GigCard from "@/components/gig/GigCard";
import { GigCardSkeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const containerVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: featured, isLoading: featuredLoading } = useFeaturedGigs();
  const { data: newGigs, isLoading: newLoading } = useGigs({ sort: "newest", size: 10 });
  const { data: notifications } = useNotifications();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-tg-text">
              <span className="text-accent">VORK</span>
            </h1>
            <p className="text-xs text-tg-hint">
              {user ? `Привет, ${user.first_name}!` : "Фриланс в Telegram"}
            </p>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-xl bg-tg-secondary-bg"
          >
            <Bell size={20} className="text-tg-text" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-danger text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 bg-tg-secondary-bg rounded-2xl px-4 py-3">
            <Search size={18} className="text-tg-hint flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-tg-text placeholder:text-tg-hint outline-none text-sm"
              placeholder="Найти услугу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Categories */}
      <div className="mt-2">
        <div className="px-4 mb-2">
          <h2 className="section-title">Категории</h2>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {catsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-2xl animate-skeleton" />
              ))
            : categories?.map((cat) => (
                <motion.button
                  key={cat.id}
                  variants={itemVariants}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20"
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  whileTap={{ scale: 0.93 }}
                >
                  <div className="w-14 h-14 bg-tg-secondary-bg rounded-2xl flex items-center justify-center text-2xl">
                    {cat.emoji}
                  </div>
                  <span className="text-[10px] text-tg-text text-center leading-tight font-medium line-clamp-2">
                    {cat.name}
                  </span>
                </motion.button>
              ))}
        </div>
      </div>

      {/* Featured Gigs */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="section-title">⭐ Популярные услуги</h2>
          <button
            className="text-xs text-tg-link"
            onClick={() => navigate("/search?sort=popular")}
          >
            Все
          </button>
        </div>
        <motion.div
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
          variants={containerVariants}
          animate="animate"
        >
          {featuredLoading
            ? Array.from({ length: 3 }).map((_, i) => <GigCardSkeleton key={i} />)
            : featured?.map((gig) => (
                <motion.div key={gig.id} variants={itemVariants}>
                  <GigCard gig={gig} />
                </motion.div>
              ))}
        </motion.div>
      </div>

      {/* New Gigs */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="section-title">🆕 Новые исполнители</h2>
          <button
            className="text-xs text-tg-link"
            onClick={() => navigate("/search?sort=newest")}
          >
            Все
          </button>
        </div>
        <motion.div
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
          variants={containerVariants}
          animate="animate"
        >
          {newLoading
            ? Array.from({ length: 3 }).map((_, i) => <GigCardSkeleton key={i} />)
            : newGigs?.items?.map((gig) => (
                <motion.div key={gig.id} variants={itemVariants}>
                  <GigCard gig={gig} compact />
                </motion.div>
              ))}
        </motion.div>
      </div>

      {/* CTA for freelancers */}
      {user && !user.is_freelancer && (
        <div className="mx-4 mt-5 p-4 bg-gradient-to-r from-accent to-orange-400 rounded-2xl text-white">
          <h3 className="font-heading font-bold text-base mb-1">Стань исполнителем!</h3>
          <p className="text-sm opacity-90 mb-3">Размести услугу и получи первых клиентов</p>
          <button
            className="bg-white text-accent font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5"
            onClick={() => navigate("/gig/create")}
          >
            <Plus size={16} />
            Добавить услугу
          </button>
        </div>
      )}

      {user?.is_freelancer && (
        <div className="mx-4 mt-5">
          <motion.button
            className="w-full btn-primary flex items-center justify-center gap-2"
            onClick={() => navigate("/gig/create")}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={20} />
            Новая услуга
          </motion.button>
        </div>
      )}

      <div className="h-4" />
    </motion.div>
  );
}
