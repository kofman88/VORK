import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Package } from "lucide-react";
import { cn, ORDER_STATUS_MAP, formatPrice, formatDeadline, getPackageLabel } from "@/utils";
import type { Order } from "@/types";
import { useAuthStore } from "@/store/authStore";

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const statusInfo = ORDER_STATUS_MAP[order.status];
  const isBuyer = user?.id === order.buyer_id;

  const deadline = order.delivery_deadline ? formatDeadline(order.delivery_deadline) : null;

  const thumbnail = order.gig?.gallery?.[0]?.thumbnail || order.gig?.gallery?.[0]?.url;
  const otherUser = isBuyer ? order.seller : order.buyer;

  return (
    <motion.div
      className="card p-4 cursor-pointer"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={20} className="text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-tg-text line-clamp-2 flex-1">
              {order.gig?.title || "Услуга удалена"}
            </p>
            <span
              className={cn(
                "badge flex-shrink-0",
                statusInfo.color === "success" && "badge-success",
                statusInfo.color === "warning" && "badge-warning",
                statusInfo.color === "danger" && "badge-danger",
                statusInfo.color === "link" && "bg-blue-50 text-blue-600",
              )}
            >
              {statusInfo.label}
            </span>
          </div>

          <p className="text-xs text-tg-hint mt-1">
            {order.order_number} · {getPackageLabel(order.package_name)} · {isBuyer ? "Исполнитель" : "Заказчик"}: {otherUser?.first_name}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-sm font-bold text-tg-text">
              {formatPrice(order.price)}
            </span>
            {deadline && ["in_progress", "revision", "delivered"].includes(order.status) && (
              <span className={cn("flex items-center gap-1 text-xs", deadline.isUrgent ? "text-danger" : "text-tg-hint")}>
                <Clock size={12} />
                {deadline.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!["cancelled", "disputed"].includes(order.status) && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            {["pending", "in_progress", "delivered", "completed"].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full",
                  statusInfo.step >= i ? "bg-accent" : "bg-gray-200"
                )}
              />
            ))}
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${Math.max(5, (statusInfo.step / 3) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
