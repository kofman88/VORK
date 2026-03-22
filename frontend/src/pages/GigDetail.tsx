import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Heart, Share2, Star, Package, Clock, MessageCircle,
  ChevronRight, Check, Info
} from "lucide-react";
import { useGig, useGigReviews, useCreateOrder, useMe } from "@/api/hooks";
import { useToggleFavorite } from "@/api/hooks";
import BottomSheet from "@/components/ui/BottomSheet";
import StarRating from "@/components/ui/StarRating";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { cn, formatPrice, formatStars, getAvatarUrl, LEVEL_CONFIG, formatRelativeTime } from "@/utils";
import type { Package as PkgType } from "@/types";

const TABS = ["Описание", "Пакеты", "Отзывы", "FAQ"];

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { haptic, tg } = useTelegram();

  const { data: gig, isLoading } = useGig(id!);
  const { data: reviews } = useGigReviews(id!);
  const { data: me } = useMe();
  const toggleFav = useToggleFavorite();
  const createOrder = useCreateOrder();

  const [activeTab, setActiveTab] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(0);
  const [requirements, setRequirements] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stars" | "card">("stars");
  const [isFav, setIsFav] = useState(gig?.is_favorited || false);

  useEffect(() => {
    if (gig) setIsFav(gig.is_favorited);
  }, [gig?.is_favorited]);

  // Back button
  useEffect(() => {
    const cleanup = tg?.BackButton
      ? (() => {
          tg.BackButton.show();
          const handler = () => navigate(-1);
          tg.BackButton.onClick(handler);
          return () => {
            tg.BackButton.offClick(handler);
            tg.BackButton.hide();
          };
        })()
      : undefined;
    return cleanup;
  }, [tg, navigate]);

  const handleFavorite = () => {
    haptic.impact("light");
    setIsFav(!isFav);
    if (id) toggleFav.mutate(id);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/gig/${id}`;
    if (tg?.openTelegramLink) {
      tg.openLink(url);
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleOrder = () => {
    if (!me) return;
    haptic.impact("medium");
    setShowCheckout(true);
    setCheckoutStep(0);
  };

  const handleConfirmOrder = async () => {
    if (!gig) return;
    const pkg = gig.packages[selectedPackage];
    haptic.notification("success");

    createOrder.mutate({
      gig_id: gig.id,
      package_name: pkg.name,
      requirements_text: requirements,
      payment_method: paymentMethod,
    }, {
      onSuccess: (order) => {
        setShowCheckout(false);
        navigate(`/orders/${order.id}`);
      },
    });
  };

  if (isLoading || !gig) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <div className="px-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const pkg = gig.packages[selectedPackage];
  const levelCfg = LEVEL_CONFIG[gig.seller?.level || "newbie"];

  return (
    <div>
      {/* Image Gallery */}
      <div className="relative h-64 bg-gray-100">
        {gig.gallery.length > 0 ? (
          <>
            <img
              src={gig.gallery[activeImage]?.url}
              alt={gig.title}
              className="w-full h-full object-cover"
            />
            {gig.gallery.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {gig.gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn("h-1.5 rounded-full transition-all", i === activeImage ? "w-4 bg-white" : "w-1.5 bg-white/60")}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-soft to-orange-50">
            <Package size={60} className="text-accent/30" />
          </div>
        )}

        {/* Nav buttons */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleFavorite}
            className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
          >
            <Heart size={18} className={isFav ? "fill-danger text-danger" : "text-gray-500"} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
          >
            <Share2 size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {/* Title & Stats */}
        <h1 className="font-heading text-xl font-bold text-tg-text mb-2">{gig.title}</h1>

        <div className="flex items-center gap-3 text-sm text-tg-hint mb-3">
          {gig.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star size={14} className="fill-warning text-warning" />
              <span className="font-medium text-tg-text">{gig.rating.toFixed(1)}</span>
              ({gig.reviews_count})
            </span>
          )}
          <span className="flex items-center gap-1">
            <Package size={14} />
            {gig.orders_count} заказов
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            от {gig.min_delivery_days} дн
          </span>
        </div>

        {/* Seller */}
        {gig.seller && (
          <div
            className="flex items-center gap-3 p-3 bg-tg-secondary-bg rounded-2xl mb-4 cursor-pointer"
            onClick={() => navigate(`/profile/${gig.seller_id}`)}
          >
            <div className="relative">
              <img
                src={getAvatarUrl(gig.seller)}
                alt={gig.seller.first_name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {gig.seller.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-tg-text text-sm">{gig.seller.first_name}</span>
                {gig.seller.is_verified && <span className="text-tg-link text-xs">✓</span>}
                <span className="text-sm">{levelCfg.emoji}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-tg-hint">
                <StarRating rating={gig.seller.rating} size={11} />
                <span>{gig.seller.completed_orders} выполнено</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-tg-hint" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-tg-secondary-bg p-1 rounded-2xl mb-4">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-xl transition-all",
                activeTab === i
                  ? "bg-white text-tg-text shadow-sm"
                  : "text-tg-hint"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 0 && (
              <div className="prose text-sm text-tg-text whitespace-pre-wrap leading-relaxed">
                {gig.description}
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-3">
                {gig.packages.map((pkg, i) => (
                  <div
                    key={pkg.name}
                    onClick={() => { setSelectedPackage(i); setShowCheckout(true); }}
                    className={cn(
                      "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                      selectedPackage === i ? "border-accent bg-accent-soft" : "border-gray-100 bg-tg-secondary-bg"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-tg-text capitalize">
                          {pkg.name === "basic" ? "Базовый" : pkg.name === "standard" ? "Стандарт" : "Премиум"}
                        </span>
                        <p className="text-xs text-tg-hint mt-0.5">{pkg.description}</p>
                      </div>
                      <span className="font-mono font-bold text-accent">{formatPrice(pkg.price)}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-tg-hint mt-2">
                      <span>⏱ {pkg.delivery_days} дн</span>
                      <span>🔄 {pkg.revisions} правки</span>
                    </div>
                    {pkg.features.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {pkg.features.map(f => (
                          <div key={f} className="flex items-center gap-1.5 text-xs text-tg-text">
                            <Check size={12} className="text-success" />
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 2 && (
              <div>
                {reviews?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-2">⭐</p>
                    <p className="text-tg-hint text-sm">Отзывов пока нет</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews?.map(review => (
                      <div key={review.id} className="bg-tg-secondary-bg rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={getAvatarUrl(review.reviewer || { first_name: "U" })}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <span className="text-sm font-medium">{review.reviewer?.first_name}</span>
                            <div className="flex items-center gap-1">
                              <StarRating rating={review.rating} size={11} />
                              <span className="text-xs text-tg-hint">{formatRelativeTime(review.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        {review.comment && <p className="text-sm text-tg-text">{review.comment}</p>}
                        {review.seller_reply && (
                          <div className="mt-2 pl-3 border-l-2 border-accent">
                            <p className="text-xs text-tg-hint">Ответ исполнителя:</p>
                            <p className="text-sm text-tg-text">{review.seller_reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-3">
                {gig.faq.length === 0 ? (
                  <p className="text-center text-tg-hint text-sm py-4">FAQ не добавлен</p>
                ) : gig.faq.map((item, i) => (
                  <div key={i} className="bg-tg-secondary-bg rounded-2xl p-4">
                    <p className="font-medium text-sm text-tg-text mb-1">{item.question}</p>
                    <p className="text-sm text-tg-hint">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-2">
        <button
          onClick={() => gig.seller && navigate(`/chats/${gig.seller_id}`)}
          className="flex-shrink-0 p-3.5 bg-tg-secondary-bg rounded-2xl"
        >
          <MessageCircle size={20} className="text-tg-text" />
        </button>
        <button
          onClick={handleOrder}
          className="flex-1 btn-primary text-center"
        >
          Заказать от {formatPrice(gig.min_price)}
        </button>
      </div>

      {/* Checkout Bottom Sheet */}
      <BottomSheet
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title={checkoutStep === 0 ? "Выберите пакет" : checkoutStep === 1 ? "Требования" : "Оплата"}
      >
        <div className="px-4 pb-6">
          {checkoutStep === 0 && (
            <div className="space-y-3">
              {gig.packages.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPackage(i)}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all",
                    selectedPackage === i ? "border-accent bg-accent-soft" : "border-gray-100"
                  )}
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{p.name === "basic" ? "Базовый" : p.name === "standard" ? "Стандарт" : "Премиум"}</span>
                    <span className="font-mono font-bold text-accent">{formatPrice(p.price)}</span>
                  </div>
                  <p className="text-xs text-tg-hint mt-1">{p.description}</p>
                  <div className="flex gap-3 text-xs text-tg-hint mt-2">
                    <span>⏱ {p.delivery_days} дн</span>
                    <span>🔄 {p.revisions} правки</span>
                  </div>
                </button>
              ))}
              <button onClick={() => setCheckoutStep(1)} className="w-full btn-primary">
                Продолжить
              </button>
            </div>
          )}

          {checkoutStep === 1 && (
            <div className="space-y-4">
              {gig.requirements && (
                <div className="bg-tg-secondary-bg rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info size={14} className="text-tg-hint" />
                    <span className="text-xs font-medium text-tg-hint">Требуется от заказчика:</span>
                  </div>
                  <p className="text-sm text-tg-text">{gig.requirements}</p>
                </div>
              )}
              <textarea
                className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm text-tg-text placeholder:text-tg-hint outline-none resize-none"
                placeholder="Опишите задачу подробнее..."
                rows={5}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setCheckoutStep(0)} className="btn-secondary flex-1">Назад</button>
                <button onClick={() => setCheckoutStep(2)} className="btn-primary flex-1">Далее</button>
              </div>
            </div>
          )}

          {checkoutStep === 2 && pkg && (
            <div className="space-y-4">
              {/* Order summary */}
              <div className="bg-tg-secondary-bg rounded-2xl p-4">
                <h3 className="font-semibold text-sm mb-3">Итог заказа</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Услуга</span>
                    <span className="text-tg-text line-clamp-1 max-w-32">{gig.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Пакет</span>
                    <span>{pkg.name === "basic" ? "Базовый" : pkg.name === "standard" ? "Стандарт" : "Премиум"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Срок</span>
                    <span>{pkg.delivery_days} дней</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Итого</span>
                    <span className="font-mono text-accent">{formatPrice(pkg.price)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-sm font-semibold block mb-2">Способ оплаты</label>
                {[
                  { value: "stars", label: "⭐ Telegram Stars", desc: `${Math.ceil(pkg.price / 5)} Stars` },
                  { value: "card", label: "💳 Баланс / Карта", desc: formatPrice(pkg.price) },
                ].map(method => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value as "stars" | "card")}
                    className={cn(
                      "w-full p-3 rounded-2xl border-2 flex items-center justify-between mb-2",
                      paymentMethod === method.value ? "border-accent bg-accent-soft" : "border-gray-100"
                    )}
                  >
                    <span className="font-medium text-sm">{method.label}</span>
                    <span className="text-tg-hint text-sm">{method.desc}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setCheckoutStep(1)} className="btn-secondary flex-1">Назад</button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={createOrder.isPending}
                  className="btn-primary flex-1"
                >
                  {createOrder.isPending ? "..." : "Оплатить"}
                </button>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Spacer for bottom bar */}
      <div className="h-32" />
    </div>
  );
}
