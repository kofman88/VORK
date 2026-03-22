import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, MessageCircle, Check, RotateCcw, AlertTriangle,
  Upload, Star, Send
} from "lucide-react";
import {
  useOrder, useDeliverOrder, useCompleteOrder,
  useRequestRevision, useOpenDispute, useCreateReview, useMe
} from "@/api/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import StarRating from "@/components/ui/StarRating";
import { cn, ORDER_STATUS_MAP, formatPrice, formatDeadline, formatDate, getAvatarUrl, getPackageLabel } from "@/utils";
import { useTelegram } from "@/hooks/useTelegram";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tg, haptic } = useTelegram();
  const { data: me } = useMe();

  const { data: order, isLoading } = useOrder(id!);
  const deliverOrder = useDeliverOrder();
  const completeOrder = useCompleteOrder();
  const requestRevision = useRequestRevision();
  const openDispute = useOpenDispute();
  const createReview = useCreateReview();

  const [showDeliver, setShowDeliver] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewRatings, setReviewRatings] = useState({
    rating: 5, communication_rating: 5, quality_rating: 5, deadline_rating: 5, comment: ""
  });

  useEffect(() => {
    if (!tg) return;
    tg.BackButton.show();
    const handler = () => navigate(-1);
    tg.BackButton.onClick(handler);
    return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
  }, [tg, navigate]);

  if (isLoading || !order) {
    return <div className="px-4 pt-4 space-y-3">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>;
  }

  const isBuyer = me?.id === order.buyer_id;
  const isSeller = me?.id === order.seller_id;
  const statusInfo = ORDER_STATUS_MAP[order.status];
  const deadline = order.delivery_deadline ? formatDeadline(order.delivery_deadline) : null;

  const handleDeliver = () => {
    deliverOrder.mutate({ id: order.id, data: { delivery_note: deliveryNote, delivery_files: [] } }, {
      onSuccess: () => { setShowDeliver(false); haptic.notification("success"); }
    });
  };

  const handleRevision = () => {
    requestRevision.mutate({ id: order.id, reason: revisionReason }, {
      onSuccess: () => { setShowRevision(false); haptic.notification("warning"); }
    });
  };

  const handleComplete = () => {
    haptic.notification("success");
    completeOrder.mutate(order.id, {
      onSuccess: () => {
        if (!order.is_rated_by_buyer) setShowReview(true);
      }
    });
  };

  const handleDispute = () => {
    openDispute.mutate({ id: order.id, reason: disputeReason }, {
      onSuccess: () => { setShowDispute(false); haptic.notification("error"); }
    });
  };

  const handleSubmitReview = () => {
    createReview.mutate({
      order_id: order.id,
      ...reviewRatings,
    }, {
      onSuccess: () => { setShowReview(false); haptic.notification("success"); }
    });
  };

  const otherUser = isBuyer ? order.seller : order.buyer;

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-lg">{order.order_number}</h1>
          <p className="text-xs text-tg-hint">{formatDate(order.created_at)}</p>
        </div>
        <span className={cn(
          "ml-auto badge",
          statusInfo.color === "success" && "badge-success",
          statusInfo.color === "warning" && "badge-warning",
          statusInfo.color === "danger" && "badge-danger",
          statusInfo.color === "link" && "bg-blue-50 text-blue-600",
        )}>
          {statusInfo.label}
        </span>
      </div>

      {/* Gig info */}
      <div className="mx-4 bg-tg-secondary-bg rounded-2xl p-4 mb-4">
        <p className="font-semibold text-sm">{order.gig?.title}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-tg-hint">
          <span>📦 {getPackageLabel(order.package_name)}</span>
          <span>💰 {formatPrice(order.price)}</span>
          {deadline && (
            <span className={cn("flex items-center gap-1", deadline.isUrgent ? "text-danger" : "")}>
              <Clock size={11} />
              {deadline.text}
            </span>
          )}
        </div>
      </div>

      {/* Other party */}
      {otherUser && (
        <div
          className="mx-4 flex items-center gap-3 bg-tg-secondary-bg rounded-2xl p-3 mb-4 cursor-pointer"
          onClick={() => navigate(`/chats/${otherUser.id}`)}
        >
          <img src={getAvatarUrl(otherUser)} alt="" className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <p className="text-sm font-medium">{otherUser.first_name}</p>
            <p className="text-xs text-tg-hint">{isBuyer ? "Исполнитель" : "Заказчик"}</p>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-tg-link" />
          </div>
        </div>
      )}

      {/* Requirements */}
      {order.requirements_text && (
        <div className="mx-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Требования заказчика</h3>
          <div className="bg-tg-secondary-bg rounded-2xl p-3 text-sm text-tg-text">
            {order.requirements_text}
          </div>
        </div>
      )}

      {/* Delivery */}
      {order.delivery_note && (
        <div className="mx-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Сдача работы</h3>
          <div className="bg-tg-secondary-bg rounded-2xl p-3">
            <p className="text-sm text-tg-text">{order.delivery_note}</p>
            {order.delivery_files.length > 0 && (
              <div className="mt-2 space-y-1">
                {order.delivery_files.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-tg-link"
                  >
                    📎 {f.filename || `Файл ${i + 1}`}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-20 left-0 right-0 px-4 space-y-2">
        {/* Seller actions */}
        {isSeller && ["in_progress", "revision"].includes(order.status) && (
          <button
            onClick={() => setShowDeliver(true)}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            Сдать работу
          </button>
        )}

        {/* Buyer actions */}
        {isBuyer && order.status === "delivered" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRevision(true)}
              className="flex-1 btn-secondary flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={16} />
              Правки
            </button>
            <button
              onClick={handleComplete}
              disabled={completeOrder.isPending}
              className="flex-1 btn-primary flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              Принять
            </button>
          </div>
        )}

        {isBuyer && ["in_progress", "revision", "delivered"].includes(order.status) && (
          <button
            onClick={() => setShowDispute(true)}
            className="w-full py-3 text-danger text-sm font-medium border border-danger/30 rounded-xl"
          >
            Открыть спор
          </button>
        )}

        {order.status === "completed" && isBuyer && !order.is_rated_by_buyer && (
          <button
            onClick={() => setShowReview(true)}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Star size={18} />
            Оставить отзыв
          </button>
        )}
      </div>

      {/* Deliver Sheet */}
      <BottomSheet isOpen={showDeliver} onClose={() => setShowDeliver(false)} title="Сдача работы">
        <div className="px-4 pb-6 space-y-3">
          <textarea
            className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
            placeholder="Опишите что сделано..."
            rows={4}
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
          />
          <button onClick={handleDeliver} disabled={deliverOrder.isPending} className="w-full btn-primary">
            {deliverOrder.isPending ? "..." : "Сдать"}
          </button>
        </div>
      </BottomSheet>

      {/* Revision Sheet */}
      <BottomSheet isOpen={showRevision} onClose={() => setShowRevision(false)} title="Запрос правок">
        <div className="px-4 pb-6 space-y-3">
          <p className="text-xs text-tg-hint">Использовано {order.revisions_used} из {order.package_snapshot.revisions} правок</p>
          <textarea
            className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
            placeholder="Что нужно исправить?"
            rows={4}
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
          />
          <button onClick={handleRevision} disabled={requestRevision.isPending || !revisionReason} className="w-full btn-primary">
            Запросить
          </button>
        </div>
      </BottomSheet>

      {/* Dispute Sheet */}
      <BottomSheet isOpen={showDispute} onClose={() => setShowDispute(false)} title="Открыть спор">
        <div className="px-4 pb-6 space-y-3">
          <p className="text-sm text-tg-hint">Опишите проблему. Модераторы рассмотрят заявку в течение 24 часов.</p>
          <textarea
            className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
            placeholder="Причина спора..."
            rows={4}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
          <button onClick={handleDispute} disabled={openDispute.isPending || !disputeReason} className="w-full py-3 bg-danger text-white rounded-xl font-semibold">
            Открыть спор
          </button>
        </div>
      </BottomSheet>

      {/* Review Sheet */}
      <BottomSheet isOpen={showReview} onClose={() => setShowReview(false)} title="Оставить отзыв">
        <div className="px-4 pb-6 space-y-4">
          {[
            { key: "rating", label: "Общая оценка" },
            { key: "communication_rating", label: "Общение" },
            { key: "quality_rating", label: "Качество работы" },
            { key: "deadline_rating", label: "Соблюдение сроков" },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-sm font-medium mb-1">{label}</p>
              <StarRating
                rating={(reviewRatings as Record<string, number>)[key]}
                interactive
                size={28}
                onChange={(r) => setReviewRatings(prev => ({ ...prev, [key]: r }))}
              />
            </div>
          ))}
          <textarea
            className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
            placeholder="Комментарий (необязательно)"
            rows={3}
            value={reviewRatings.comment}
            onChange={(e) => setReviewRatings(prev => ({ ...prev, comment: e.target.value }))}
          />
          <button onClick={handleSubmitReview} disabled={createReview.isPending} className="w-full btn-primary">
            Отправить отзыв
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
