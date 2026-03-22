import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Edit2, Eye, EyeOff, Package } from "lucide-react";
import { useMyGigs, useUpdateGig } from "@/api/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, cn } from "@/utils";
import apiClient from "@/api/client";

export default function MyGigs() {
  const navigate = useNavigate();
  const { data: gigs, isLoading, refetch } = useMyGigs();
  const updateGig = useUpdateGig();

  const toggleActive = (gigId: string, isActive: boolean) => {
    updateGig.mutate({ id: gigId, data: { is_active: !isActive } }, {
      onSuccess: () => refetch(),
    });
  };

  return (
    <div>
      <div className="px-4 pt-4 flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold">Мои услуги</h1>
        <button
          onClick={() => navigate("/gig/create")}
          className="flex items-center gap-1.5 bg-accent text-white px-3 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : gigs?.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-tg-text">Нет услуг</p>
            <p className="text-sm text-tg-hint mt-1 mb-4">Создайте первую услугу</p>
            <button onClick={() => navigate("/gig/create")} className="btn-primary">
              Создать услугу
            </button>
          </div>
        ) : (
          gigs?.map(gig => (
            <motion.div
              key={gig.id}
              className="bg-tg-secondary-bg rounded-2xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {gig.gallery[0] ? (
                    <img src={gig.gallery[0].thumbnail || gig.gallery[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{gig.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-tg-hint">
                    <span>от {formatPrice(gig.min_price)}</span>
                    <span>· {gig.orders_count} заказов</span>
                    <span>· {gig.views_count} просм</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate(`/gig/${gig.id}/edit`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-sm"
                >
                  <Edit2 size={14} />
                  Редактировать
                </button>
                <button
                  onClick={() => toggleActive(gig.id, gig.is_active)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm flex items-center gap-1.5",
                    gig.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}
                >
                  {gig.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  {gig.is_active ? "Активна" : "Скрыта"}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
