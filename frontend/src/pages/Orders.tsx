import { useState } from "react";
import { motion } from "framer-motion";
import { useOrders } from "@/api/hooks";
import OrderCard from "@/components/order/OrderCard";
import { ListItemSkeleton } from "@/components/ui/Skeleton";
import type { OrderStatus } from "@/types";

const TABS = [
  { label: "Активные", statuses: ["pending", "in_progress", "revision", "delivered"] },
  { label: "Завершённые", statuses: ["completed"] },
  { label: "Отменённые", statuses: ["cancelled", "disputed"] },
];

export default function Orders() {
  const [activeTab, setActiveTab] = useState(0);
  const [role, setRole] = useState<"all" | "buyer" | "seller">("all");

  const { data: orders, isLoading } = useOrders({ role });

  const filteredOrders = orders?.filter(o =>
    TABS[activeTab].statuses.includes(o.status)
  ) || [];

  return (
    <div>
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-tg-bg z-10">
        <h1 className="font-heading text-2xl font-bold mb-3">Заказы</h1>

        {/* Role toggle */}
        <div className="flex gap-2 mb-3">
          {(["all", "buyer", "seller"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                role === r ? "bg-accent text-white" : "bg-tg-secondary-bg text-tg-hint"
              }`}
            >
              {r === "all" ? "Все" : r === "buyer" ? "Покупки" : "Продажи"}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-tg-secondary-bg p-1 rounded-2xl">
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
                activeTab === i ? "bg-white text-tg-text shadow-sm" : "text-tg-hint"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-tg-text">Заказов нет</p>
            <p className="text-sm text-tg-hint mt-1">
              {activeTab === 0 ? "У вас нет активных заказов" : "Здесь появятся завершённые заказы"}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <OrderCard order={order} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
