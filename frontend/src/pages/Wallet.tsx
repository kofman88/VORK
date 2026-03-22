import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Plus, Star } from "lucide-react";
import { useWallet, useTransactions } from "@/api/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import { formatPrice, formatRelativeTime, cn } from "@/utils";
import { useTelegram } from "@/hooks/useTelegram";

const TX_ICONS: Record<string, string> = {
  deposit: "➕",
  withdrawal: "⬆️",
  order_payment: "💳",
  order_earning: "💰",
  refund: "↩️",
  platform_fee: "🏢",
  referral_bonus: "🎁",
};

export default function Wallet() {
  const navigate = useNavigate();
  const { tg } = useTelegram();
  const { data: wallet, isLoading } = useWallet();
  const { data: transactions } = useTransactions();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  return (
    <div>
      <div className="px-4 pt-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading text-xl font-bold">Кошелёк</h1>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Balance card */}
          <div className="mx-4 bg-gradient-to-br from-accent to-orange-500 text-white rounded-2xl p-5 mb-4">
            <p className="text-sm opacity-80 mb-1">Баланс</p>
            <p className="font-mono font-bold text-3xl">{formatPrice(wallet?.balance || 0)}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Star size={14} className="fill-white" />
                <span className="text-sm">{wallet?.stars_balance || 0} Stars</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mx-4 grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex items-center justify-center gap-2 py-3 bg-tg-secondary-bg rounded-2xl"
            >
              <ArrowUpRight size={18} className="text-tg-text" />
              <span className="text-sm font-medium">Вывести</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-tg-secondary-bg rounded-2xl">
              <ArrowDownLeft size={18} className="text-tg-text" />
              <span className="text-sm font-medium">Пополнить</span>
            </button>
          </div>

          {/* Stats */}
          <div className="mx-4 grid grid-cols-2 gap-3 mb-5">
            <div className="bg-tg-secondary-bg rounded-2xl p-3">
              <p className="text-xs text-tg-hint">Всего заработано</p>
              <p className="font-mono font-bold text-base mt-0.5">{formatPrice(wallet?.total_earned || 0)}</p>
            </div>
            <div className="bg-tg-secondary-bg rounded-2xl p-3">
              <p className="text-xs text-tg-hint">Выведено</p>
              <p className="font-mono font-bold text-base mt-0.5">{formatPrice(wallet?.total_withdrawn || 0)}</p>
            </div>
          </div>

          {/* Transactions */}
          <div className="px-4">
            <h2 className="section-title mb-3">История операций</h2>
            {transactions?.length === 0 ? (
              <p className="text-center text-tg-hint py-8">Операций пока нет</p>
            ) : (
              <div className="space-y-2">
                {transactions?.map(tx => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 bg-tg-secondary-bg rounded-2xl px-4 py-3"
                  >
                    <span className="text-xl">{TX_ICONS[tx.type] || "💲"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tg-text">{tx.description || tx.type}</p>
                      <p className="text-xs text-tg-hint">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                    <span className={cn(
                      "font-mono font-bold text-sm",
                      tx.type === "order_earning" || tx.type === "referral_bonus" || tx.type === "deposit"
                        ? "text-success"
                        : "text-danger"
                    )}>
                      {tx.type === "order_earning" || tx.type === "referral_bonus" || tx.type === "deposit"
                        ? "+" : "-"}
                      {tx.stars_amount ? `${tx.stars_amount} ⭐` : formatPrice(tx.amount || 0)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Withdraw Sheet */}
      <BottomSheet isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} title="Вывод средств">
        <div className="px-4 pb-6 space-y-4">
          <div className="bg-tg-secondary-bg rounded-2xl p-3 text-sm text-tg-hint">
            Минимальная сумма вывода: 1 000 ₽. Срок: 3-5 рабочих дней.
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Сумма</label>
            <input
              type="number"
              placeholder="1000"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-tg-secondary-bg rounded-xl px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Номер карты</label>
            <input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-tg-secondary-bg rounded-xl px-4 py-3 text-sm outline-none"
            />
          </div>
          <button className="w-full btn-primary">Запросить вывод</button>
        </div>
      </BottomSheet>
    </div>
  );
}
