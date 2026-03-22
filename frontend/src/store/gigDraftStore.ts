import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Package, FAQItem } from "@/types";

interface GigDraft {
  step: number;
  title: string;
  category_id?: number;
  subcategory_id?: number;
  tags: string[];
  description: string;
  faq: FAQItem[];
  gallery: Array<{ url: string; type: string }>;
  packages: Partial<Package>[];
  requirements: string;
}

interface GigDraftStore {
  draft: GigDraft;
  setStep: (step: number) => void;
  updateDraft: (data: Partial<GigDraft>) => void;
  resetDraft: () => void;
}

const defaultDraft: GigDraft = {
  step: 0,
  title: "",
  tags: [],
  description: "",
  faq: [],
  gallery: [],
  packages: [
    { name: "basic", description: "", price: 500, delivery_days: 3, revisions: 1, features: [] },
    { name: "standard", description: "", price: 1500, delivery_days: 5, revisions: 2, features: [] },
    { name: "premium", description: "", price: 3000, delivery_days: 7, revisions: 3, features: [] },
  ],
  requirements: "",
};

export const useGigDraftStore = create<GigDraftStore>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      setStep: (step) => set((s) => ({ draft: { ...s.draft, step } })),
      updateDraft: (data) => set((s) => ({ draft: { ...s.draft, ...data } })),
      resetDraft: () => set({ draft: defaultDraft }),
    }),
    { name: "vork-gig-draft" }
  )
);
