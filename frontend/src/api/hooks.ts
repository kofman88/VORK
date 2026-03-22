import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Gig, GigListResponse, Order, Message, Conversation,
  Review, Category, WalletInfo, Transaction, Notification, User,
} from "@/types";

// ── Auth ──────────────────────────────────────────────────────────────────

export const useAuth = () => {
  return useMutation({
    mutationFn: (initData: string) =>
      apiClient.post("/auth/telegram", { init_data: initData }).then(r => r.data),
  });
};

// ── Users ────────────────────────────────────────────────────────────────

export const useMe = () =>
  useQuery<User>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/users/me").then(r => r.data),
  });

export const useUser = (id: string) =>
  useQuery<User>({
    queryKey: ["user", id],
    queryFn: () => apiClient.get(`/users/${id}`).then(r => r.data),
    enabled: !!id,
  });

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) =>
      apiClient.put("/users/me", data).then(r => r.data),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
};

export const useMyStats = () =>
  useQuery({
    queryKey: ["my-stats"],
    queryFn: () => apiClient.get("/users/me/stats").then(r => r.data),
  });

// ── Categories ───────────────────────────────────────────────────────────

export const useCategories = () =>
  useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient.get("/categories").then(r => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

// ── Gigs ─────────────────────────────────────────────────────────────────

export const useGigs = (params?: Record<string, unknown>) =>
  useQuery<GigListResponse>({
    queryKey: ["gigs", params],
    queryFn: () => apiClient.get("/gigs", { params }).then(r => r.data),
  });

export const useInfiniteGigs = (params?: Record<string, unknown>) =>
  useInfiniteQuery<GigListResponse>({
    queryKey: ["gigs-infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get("/gigs", { params: { ...params, page: pageParam } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
  });

export const useGig = (id: string) =>
  useQuery<Gig>({
    queryKey: ["gig", id],
    queryFn: () => apiClient.get(`/gigs/${id}`).then(r => r.data),
    enabled: !!id,
  });

export const useMyGigs = () =>
  useQuery<Gig[]>({
    queryKey: ["my-gigs"],
    queryFn: () => apiClient.get("/gigs/my").then(r => r.data),
  });

export const useFeaturedGigs = () =>
  useQuery<Gig[]>({
    queryKey: ["featured-gigs"],
    queryFn: () => apiClient.get("/gigs/featured").then(r => r.data),
  });

export const useFavoriteGigs = () =>
  useQuery<Gig[]>({
    queryKey: ["favorite-gigs"],
    queryFn: () => apiClient.get("/gigs/favorites").then(r => r.data),
  });

export const useCreateGig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Gig>) =>
      apiClient.post("/gigs", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-gigs"] });
      qc.invalidateQueries({ queryKey: ["gigs"] });
    },
  });
};

export const useUpdateGig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Gig> }) =>
      apiClient.put(`/gigs/${id}`, data).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["gig", id] });
      qc.invalidateQueries({ queryKey: ["my-gigs"] });
    },
  });
};

export const useToggleFavorite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gigId: string) =>
      apiClient.post(`/gigs/${gigId}/favorite`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-gigs"] });
      qc.invalidateQueries({ queryKey: ["gigs"] });
    },
  });
};

// ── Search ───────────────────────────────────────────────────────────────

export const useSearch = (params?: Record<string, unknown>) =>
  useQuery<GigListResponse>({
    queryKey: ["search", params],
    queryFn: () => apiClient.get("/search", { params }).then(r => r.data),
    enabled: !!params && Object.values(params).some(v => v !== undefined && v !== ""),
  });

export const useInfiniteSearch = (params?: Record<string, unknown>) =>
  useInfiniteQuery<GigListResponse>({
    queryKey: ["search-infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get("/search", { params: { ...params, page: pageParam } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
  });

// ── Orders ───────────────────────────────────────────────────────────────

export const useOrders = (params?: Record<string, unknown>) =>
  useQuery<Order[]>({
    queryKey: ["orders", params],
    queryFn: () => apiClient.get("/orders", { params }).then(r => r.data),
  });

export const useOrder = (id: string) =>
  useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => apiClient.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
    refetchInterval: 10000, // Poll every 10s
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { gig_id: string; package_name: string; requirements_text?: string; payment_method?: string }) =>
      apiClient.post("/orders", data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
};

export const useDeliverOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { delivery_note?: string; delivery_files: unknown[] } }) =>
      apiClient.post(`/orders/${id}/deliver`, data).then(r => r.data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["order", id] }),
  });
};

export const useCompleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/orders/${id}/complete`).then(r => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useRequestRevision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/orders/${id}/revision`, { reason }).then(r => r.data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["order", id] }),
  });
};

export const useOpenDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/orders/${id}/dispute`, { reason }).then(r => r.data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ["order", id] }),
  });
};

// ── Messages ─────────────────────────────────────────────────────────────

export const useConversations = () =>
  useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiClient.get("/messages/conversations").then(r => r.data),
    refetchInterval: 5000,
  });

export const useMessages = (userId: string, orderId?: string) =>
  useQuery<Message[]>({
    queryKey: ["messages", userId, orderId],
    queryFn: () =>
      apiClient.get(`/messages/${userId}`, { params: orderId ? { order_id: orderId } : {} }).then(r => r.data),
    enabled: !!userId,
    refetchInterval: 3000,
  });

export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { receiver_id: string; content?: string; order_id?: string; message_type?: string }) =>
      apiClient.post("/messages", data).then(r => r.data),
    onSuccess: (_, { receiver_id }) => {
      qc.invalidateQueries({ queryKey: ["messages", receiver_id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// ── Reviews ──────────────────────────────────────────────────────────────

export const useGigReviews = (gigId: string) =>
  useQuery<Review[]>({
    queryKey: ["reviews", gigId],
    queryFn: () => apiClient.get(`/reviews/gig/${gigId}`).then(r => r.data),
    enabled: !!gigId,
  });

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      order_id: string;
      rating: number;
      communication_rating: number;
      quality_rating: number;
      deadline_rating: number;
      comment?: string;
    }) => apiClient.post("/reviews", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// ── Wallet ────────────────────────────────────────────────────────────────

export const useWallet = () =>
  useQuery<WalletInfo>({
    queryKey: ["wallet"],
    queryFn: () => apiClient.get("/wallet").then(r => r.data),
  });

export const useTransactions = () =>
  useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => apiClient.get("/wallet/transactions").then(r => r.data),
  });

// ── Notifications ────────────────────────────────────────────────────────

export const useNotifications = () =>
  useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get("/notifications").then(r => r.data),
    refetchInterval: 30000,
  });

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.put("/notifications/read").then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

// ── Referral ─────────────────────────────────────────────────────────────

export const useReferralStats = () =>
  useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => apiClient.get("/referral/stats").then(r => r.data),
  });

export const useReferralLink = () =>
  useQuery({
    queryKey: ["referral-link"],
    queryFn: () => apiClient.get("/referral/link").then(r => r.data),
  });
