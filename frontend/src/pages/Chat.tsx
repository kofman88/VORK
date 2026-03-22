import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Paperclip, Image as ImageIcon } from "lucide-react";
import { useMessages, useSendMessage, useUser } from "@/api/hooks";
import { useAuthStore } from "@/store/authStore";
import { useAuthStore as useAuth } from "@/store/authStore";
import { cn, getAvatarUrl, formatRelativeTime } from "@/utils";
import { useTelegram } from "@/hooks/useTelegram";
import apiClient from "@/api/client";

export default function Chat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { tg, haptic } = useTelegram();
  const { user: me } = useAuthStore();

  const [text, setText] = useState("");
  const [wsMessages, setWsMessages] = useState<Record<string, unknown>[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: otherUser } = useUser(userId!);
  const { data: messages, refetch } = useMessages(userId!);
  const sendMsg = useSendMessage();

  const { accessToken } = useAuthStore();

  // Setup WebSocket
  useEffect(() => {
    if (!accessToken) return;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/chat/${accessToken}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message" && !data.echo) {
        refetch();
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [accessToken]);

  // Back button
  useEffect(() => {
    if (!tg) return;
    tg.BackButton.show();
    const handler = () => navigate(-1);
    tg.BackButton.onClick(handler);
    return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
  }, [tg, navigate]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !userId) return;

    const msg = text;
    setText("");
    haptic.impact("light");

    // Send via WebSocket if connected, fallback to REST
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        receiver_id: userId,
        content: msg,
      }));
      // Refresh to get the saved message
      setTimeout(() => refetch(), 500);
    } else {
      sendMsg.mutate({ receiver_id: userId, content: msg });
    }
  };

  const allMessages = messages || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-tg-bg border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        {otherUser && (
          <>
            <div className="relative">
              <img src={getAvatarUrl(otherUser)} alt="" className="w-9 h-9 rounded-full" />
              {otherUser.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{otherUser.first_name}</p>
              <p className="text-xs text-tg-hint">{otherUser.is_online ? "Онлайн" : "Не в сети"}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {allMessages.map((msg) => {
          const isMe = msg.sender_id === me?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              {!isMe && (
                <img
                  src={getAvatarUrl(msg.sender || { first_name: "U" })}
                  alt=""
                  className="w-7 h-7 rounded-full mr-2 self-end flex-shrink-0"
                />
              )}
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-2xl",
                  isMe
                    ? "bg-accent text-white rounded-br-sm"
                    : "bg-tg-secondary-bg text-tg-text rounded-bl-sm"
                )}
              >
                {msg.message_type === "system" ? (
                  <p className="text-xs italic opacity-75">{msg.content}</p>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={cn("text-[10px] mt-1", isMe ? "text-white/70 text-right" : "text-tg-hint")}>
                  {formatRelativeTime(msg.created_at)}
                  {isMe && (msg.is_read ? " ✓✓" : " ✓")}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-tg-bg border-t border-gray-100 pb-safe flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2 bg-tg-secondary-bg rounded-2xl px-3 py-2">
          <textarea
            className="flex-1 bg-transparent text-sm text-tg-text placeholder:text-tg-hint outline-none resize-none max-h-32 leading-relaxed"
            placeholder="Сообщение..."
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            text.trim() ? "bg-accent text-white" : "bg-tg-secondary-bg text-tg-hint"
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
