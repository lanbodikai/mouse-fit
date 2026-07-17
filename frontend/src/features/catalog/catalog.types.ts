import type { Mouse } from "@/types/api";

export type SortKey = "name" | "weight";

export type MouseCatalogItem = {
  id: string;
  displayTitle: string;
  matchPercentLabel: string;
  showImagePlaceholder: boolean;
  imageUrl: string | null;
  searchText: string;
  data: Mouse;
};

export type SpecEntry = {
  label: string;
  value: string;
};
