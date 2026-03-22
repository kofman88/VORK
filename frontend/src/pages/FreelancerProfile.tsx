import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Star, Package, Shield } from "lucide-react";
import { useUser, useGigs, useGigReviews } from "@/api/hooks";
import GigCard from "@/components/gig/GigCard";
import { Skeleton } from "@/components/ui/Skeleton";
import StarRating from "@/components/ui/StarRating";
import { getAvatarUrl, LEVEL_CONFIG, formatRelativeTime, cn } from "@/utils";

export default function FreelancerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(id!);
  const { data: gigsData } = useGigs({ seller_id: id });

  if (isLoading || !user) {
    return <div className="px-4 pt-4 space-y-3">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>;
  }

  const levelCfg = LEVEL_CONFIG[user.level];

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading text-lg font-bold">Профиль исполнителя</h1>
      </div>

      <div className="px-4">
        {/* Avatar & name */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img src={getAvatarUrl(user)} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            {user.is_online && (
              <span className="absolute bottom-1 right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading text-xl font-bold">{user.first_name}</h2>
              {user.is_verified && <Shield size={16} className="text-tg-link" />}
            </div>
            {user.username && <p className="text-tg-hint text-sm">@{user.username}</p>}
            <div className="flex items-center gap-1.5 mt-1">
              <span>{levelCfg.emoji}</span>
              <span className={cn("text-sm font-medium", levelCfg.color)}>{levelCfg.label}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Рейтинг", value: user.rating > 0 ? `${user.rating.toFixed(1)} ⭐` : "—" },
            { label: "Отзывы", value: user.reviews_count },
            { label: "Заказов", value: user.completed_orders },
          ].map(({ label, value }) => (
            <div key={label} className="bg-tg-secondary-bg rounded-2xl p-3 text-center">
              <p className="font-mono font-bold text-lg">{value}</p>
              <p className="text-xs text-tg-hint">{label}</p>
            </div>
          ))}
        </div>

        {user.bio && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1.5">О себе</h3>
            <p className="text-sm text-tg-hint leading-relaxed">{user.bio}</p>
          </div>
        )}

        {user.skills.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2">Навыки</h3>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-tg-secondary-bg rounded-full text-xs">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Gigs */}
        {gigsData && gigsData.items.length > 0 && (
          <div className="mb-4">
            <h3 className="section-title mb-3">Услуги</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {gigsData.items.map(gig => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Write button */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <button
          onClick={() => navigate(`/chats/${id}`)}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          Написать
        </button>
      </div>
    </div>
  );
}
