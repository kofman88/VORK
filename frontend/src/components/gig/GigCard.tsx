import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, Package, Clock, Zap } from "lucide-react";
import { cn, formatPrice, getAvatarUrl, LEVEL_CONFIG } from "@/utils";
import { useToggleFavorite } from "@/api/hooks";
import { useTelegram } from "@/hooks/useTelegram";
import type { Gig } from "@/types";

interface GigCardProps {
  gig: Gig;
  compact?: boolean;
}

export default function GigCard({ gig, compact = false }: GigCardProps) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [isFav, setIsFav] = useState(gig.is_favorited);
  const toggleFav = useToggleFavorite();

  const thumbnail = gig.gallery?.[0]?.thumbnail || gig.gallery?.[0]?.url;
  const levelCfg = LEVEL_CONFIG[gig.seller?.level || "newbie"];

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.impact("light");
    setIsFav(!isFav); // Optimistic update
    toggleFav.mutate(gig.id);
  };

  const handleClick = () => {
    haptic.impact("light");
    navigate(`/gig/${gig.id}`);
  };

  return (
    <motion.div
      className={cn(
        "card cursor-pointer select-none",
        compact ? "w-48 flex-shrink-0" : "w-64 flex-shrink-0"
      )}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden bg-gray-100", compact ? "h-32" : "h-40")}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={gig.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-soft to-orange-100">
            <Package size={40} className="text-accent/40" />
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
        >
          <Heart
            size={16}
            className={cn(isFav ? "fill-danger text-danger" : "text-gray-400")}
          />
        </button>

        {/* Featured badge */}
        {gig.is_featured && (
          <div className="absolute top-2 left-2 badge-accent text-[10px]">
            ⭐ В топе
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Seller */}
        {gig.seller && (
          <div className="flex items-center gap-1.5">
            <img
              src={getAvatarUrl(gig.seller)}
              alt={gig.seller.first_name}
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="text-xs text-tg-hint truncate flex-1">
              {gig.seller.first_name}
            </span>
            {gig.seller.is_online && (
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
            )}
            <span className="text-[10px]">{levelCfg.emoji}</span>
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium text-tg-text line-clamp-2 leading-snug">
          {gig.title}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-tg-hint">
          {gig.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={11} className="fill-warning text-warning" />
              {gig.rating.toFixed(1)}
              {gig.reviews_count > 0 && ` (${gig.reviews_count})`}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Package size={11} />
            {gig.orders_count}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock size={11} />
            {gig.min_delivery_days}д
          </span>
          {gig.avg_response_time && gig.avg_response_time < 60 && (
            <span className="flex items-center gap-0.5 text-success">
              <Zap size={11} />
              Быстро
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-tg-hint text-xs">от</span>
          <span className="font-mono font-bold text-accent text-sm">
            {formatPrice(gig.min_price)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
