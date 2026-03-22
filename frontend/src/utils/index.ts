import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "₽"): string {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

export function formatStars(amount: number): string {
  return `${amount} ⭐`;
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ru });
}

export function formatDate(dateStr: string, fmt = "dd MMM yyyy"): string {
  return format(new Date(dateStr), fmt, { locale: ru });
}

export function formatDeadline(dateStr: string): { text: string; isUrgent: boolean } {
  const deadline = new Date(dateStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffMs < 0) {
    return { text: "Просрочен", isUrgent: true };
  } else if (diffHours < 24) {
    return { text: `${Math.ceil(diffHours)}ч`, isUrgent: true };
  } else if (diffDays < 3) {
    return { text: `${Math.ceil(diffDays)}д`, isUrgent: true };
  }
  return { text: `${Math.ceil(diffDays)} дн`, isUrgent: false };
}

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: "Ожидание", color: "warning", step: 0 },
  in_progress: { label: "В работе", color: "link", step: 1 },
  revision: { label: "Правки", color: "warning", step: 2 },
  delivered: { label: "Сдан", color: "success", step: 3 },
  completed: { label: "Завершён", color: "success", step: 4 },
  cancelled: { label: "Отменён", color: "danger", step: -1 },
  disputed: { label: "Спор", color: "danger", step: -1 },
};

export const LEVEL_CONFIG = {
  newbie: { emoji: "🌱", label: "Новичок", color: "text-gray-500" },
  experienced: { emoji: "⭐", label: "Опытный", color: "text-blue-500" },
  pro: { emoji: "🔥", label: "Профи", color: "text-orange-500" },
  top: { emoji: "👑", label: "Топ", color: "text-yellow-500" },
};

export function getAvatarUrl(user: { avatar_url?: string | null; first_name: string }): string {
  if (user.avatar_url) return user.avatar_url;
  const initials = user.first_name.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initials}&background=F77F00&color=fff&size=128&bold=true`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function getPackageLabel(name: string): string {
  const labels: Record<string, string> = {
    basic: "Базовый",
    standard: "Стандарт",
    premium: "Премиум",
  };
  return labels[name] || name;
}

export function saveSearchHistory(query: string): void {
  const existing = JSON.parse(localStorage.getItem("vork-search-history") || "[]") as string[];
  const updated = [query, ...existing.filter(q => q !== query)].slice(0, 10);
  localStorage.setItem("vork-search-history", JSON.stringify(updated));
}

export function getSearchHistory(): string[] {
  return JSON.parse(localStorage.getItem("vork-search-history") || "[]");
}
