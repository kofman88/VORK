import { NavLink } from "react-router-dom";
import { Home, Search, ShoppingBag, MessageCircle, User } from "lucide-react";
import { cn } from "@/utils";
import { useNotifications } from "@/api/hooks";

const navItems = [
  { to: "/", icon: Home, label: "Главная" },
  { to: "/search", icon: Search, label: "Поиск" },
  { to: "/orders", icon: ShoppingBag, label: "Заказы" },
  { to: "/chats", icon: MessageCircle, label: "Чаты" },
  { to: "/profile", icon: User, label: "Профиль" },
];

export default function BottomNav() {
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative",
                isActive
                  ? "text-accent"
                  : "text-tg-hint"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {to === "/chats" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-normal")}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
