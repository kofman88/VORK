import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useConversations } from "@/api/hooks";
import { ListItemSkeleton } from "@/components/ui/Skeleton";
import { getAvatarUrl, formatRelativeTime, cn } from "@/utils";

export default function ChatList() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-heading text-2xl font-bold">Сообщения</h1>
      </div>

      <div className="mt-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
        ) : conversations?.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-tg-text">Нет сообщений</p>
            <p className="text-sm text-tg-hint mt-1">Найдите исполнителя и начните общение</p>
          </div>
        ) : (
          conversations?.map((conv) => (
            <motion.div
              key={conv.user.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-tg-secondary-bg"
              onClick={() => navigate(`/chats/${conv.user.id}`)}
              whileTap={{ scale: 0.99 }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={getAvatarUrl(conv.user)}
                  alt={conv.user.first_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {conv.user.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-tg-text text-sm">{conv.user.first_name}</span>
                  <div className="flex items-center gap-1.5">
                    {conv.last_message && (
                      <span className="text-xs text-tg-hint">
                        {formatRelativeTime(conv.last_message.created_at)}
                      </span>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-accent rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                {conv.last_message && (
                  <p className={cn(
                    "text-xs truncate mt-0.5",
                    conv.unread_count > 0 ? "text-tg-text font-medium" : "text-tg-hint"
                  )}>
                    {conv.last_message.content || "📎 Файл"}
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
