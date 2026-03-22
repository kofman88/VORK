import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications, useMarkNotificationsRead } from "@/api/hooks";
import { cn, formatRelativeTime } from "@/utils";

const TYPE_ICONS: Record<string, string> = {
  new_order: "🎉",
  new_message: "💬",
  order_status: "📦",
  deadline_reminder: "⏰",
  new_review: "⭐",
  revision_request: "🔄",
  order_completed: "✅",
  referral_bonus: "🎁",
  payment_received: "💰",
  system: "🔔",
};

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if (notifications?.some(n => !n.is_read)) {
      markRead.mutate();
    }
  }, [notifications]);

  return (
    <div>
      <div className="px-4 pt-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading text-xl font-bold">Уведомления</h1>
      </div>

      <div className="px-4 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-tg-hint">Загрузка...</div>
        ) : notifications?.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-tg-text">Нет уведомлений</p>
          </div>
        ) : (
          notifications?.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-2xl",
                notif.is_read ? "bg-tg-secondary-bg" : "bg-accent/5 border border-accent/20"
              )}
            >
              <span className="text-2xl">{TYPE_ICONS[notif.type] || "🔔"}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-tg-text">{notif.title}</p>
                <p className="text-xs text-tg-hint mt-0.5">{notif.body}</p>
                <p className="text-xs text-tg-hint mt-1">{formatRelativeTime(notif.created_at)}</p>
              </div>
              {!notif.is_read && (
                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
