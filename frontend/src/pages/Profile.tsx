import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings, Package, Star, Wallet, Users, Plus,
  ChevronRight, Edit2, Shield, BarChart3
} from "lucide-react";
import { useMe, useMyStats, useWallet } from "@/api/hooks";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrl, formatPrice, LEVEL_CONFIG, cn } from "@/utils";
import type { User } from "@/types";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: me, isLoading } = useMe();
  const { data: stats } = useMyStats();
  const { data: wallet } = useWallet();

  if (isLoading || !me) return <ProfileSkeleton />;

  const levelCfg = LEVEL_CONFIG[me.level];

  const menuItems = [
    me.is_freelancer && { icon: Package, label: "Мои услуги", to: "/my-gigs" },
    { icon: Wallet, label: "Кошелёк", to: "/wallet", badge: wallet ? formatPrice(wallet.balance) : undefined },
    { icon: Star, label: "Избранное", to: "/search?favorites=true" },
    { icon: Users, label: "Реферальная программа", to: "/referral" },
    { icon: Settings, label: "Настройки", to: "/settings" },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; to: string; badge?: string }>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-4"
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={getAvatarUrl(me)}
              alt={me.first_name}
              className="w-20 h-20 rounded-2xl object-cover"
            />
            {me.is_online && (
              <span className="absolute bottom-1 right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-bold">{me.first_name} {me.last_name}</h2>
              {me.is_verified && <Shield size={16} className="text-tg-link" />}
            </div>
            {me.username && <p className="text-tg-hint text-sm">@{me.username}</p>}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg">{levelCfg.emoji}</span>
              <span className={cn("text-sm font-medium", levelCfg.color)}>{levelCfg.label}</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 bg-tg-secondary-bg rounded-xl"
          >
            <Edit2 size={18} className="text-tg-text" />
          </button>
        </div>

        {me.bio && (
          <p className="text-sm text-tg-hint mt-3 leading-relaxed">{me.bio}</p>
        )}

        {me.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {me.skills.map(skill => (
              <span key={skill} className="px-2.5 py-1 bg-tg-secondary-bg rounded-full text-xs text-tg-text">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Рейтинг", value: me.rating > 0 ? `${me.rating.toFixed(1)} ⭐` : "—" },
          { label: "Отзывы", value: me.reviews_count },
          { label: "Заказов", value: me.completed_orders },
        ].map(({ label, value }) => (
          <div key={label} className="bg-tg-secondary-bg rounded-2xl p-3 text-center">
            <p className="font-mono font-bold text-lg text-tg-text">{value}</p>
            <p className="text-xs text-tg-hint">{label}</p>
          </div>
        ))}
      </div>

      {/* Earnings (for freelancers) */}
      {me.is_freelancer && stats && (
        <div className="mx-4 bg-gradient-to-r from-accent to-orange-400 rounded-2xl p-4 text-white mb-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={18} />
            <span className="font-semibold text-sm">Заработок</span>
          </div>
          <p className="font-mono font-bold text-2xl">{formatPrice(stats.total_earned)}</p>
          <p className="text-xs opacity-80 mt-0.5">всего заработано</p>
        </div>
      )}

      {/* Wallet preview */}
      {wallet && (
        <div
          className="mx-4 bg-tg-secondary-bg rounded-2xl p-4 mb-4 cursor-pointer"
          onClick={() => navigate("/wallet")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-tg-hint mb-0.5">Баланс</p>
              <p className="font-mono font-bold text-xl text-tg-text">{formatPrice(wallet.balance)}</p>
              {wallet.stars_balance > 0 && (
                <p className="text-xs text-tg-hint">⭐ {wallet.stars_balance} Stars</p>
              )}
            </div>
            <ChevronRight size={20} className="text-tg-hint" />
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="mx-4 bg-tg-secondary-bg rounded-2xl overflow-hidden">
        {menuItems.map(({ icon: Icon, label, to, badge }, i) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5",
              i < menuItems.length - 1 && "border-b border-gray-100"
            )}
          >
            <Icon size={20} className="text-tg-hint flex-shrink-0" />
            <span className="flex-1 text-sm text-tg-text text-left">{label}</span>
            {badge && <span className="text-xs text-tg-hint">{badge}</span>}
            <ChevronRight size={16} className="text-tg-hint" />
          </button>
        ))}
      </div>

      {/* Become freelancer CTA */}
      {!me.is_freelancer && (
        <div className="mx-4 mt-4 p-4 bg-accent/5 border border-accent/20 rounded-2xl">
          <h3 className="font-semibold text-sm mb-1">Стать исполнителем</h3>
          <p className="text-xs text-tg-hint mb-3">Предлагай свои услуги и зарабатывай в Telegram</p>
          <button
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2.5"
            onClick={() => navigate("/gig/create")}
          >
            <Plus size={16} />
            Начать
          </button>
        </div>
      )}
    </motion.div>
  );
}
