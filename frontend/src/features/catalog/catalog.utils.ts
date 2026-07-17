import type { Mouse } from "@/types/api";
import type { MouseCatalogItem, SpecEntry } from "./catalog.types";

export const SORT_OPTIONS: Array<{ value: "name" | "weight"; label: string }> = [
  { value: "name", label: "Name" },
  { value: "weight", label: "Weight" },
];

export function toMouseCatalogItem(mouse: Mouse): MouseCatalogItem {
  const displayTitle = [mouse.brand, mouse.model, mouse.variant].filter(Boolean).join(" ").trim() || "Unnamed mouse";
  const searchText = [
    mouse.brand,
    mouse.model,
    mouse.variant,
    mouse.shape,
    mouse.hump,
    mouse.side_profile,
    mouse.hand_compatibility,
    mouse.availability_status,
    ...(mouse.grips ?? []),
    ...(mouse.hands ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: mouse.id,
    displayTitle,
    matchPercentLabel: "---",
    showImagePlaceholder: !mouse.image_url,
    imageUrl: mouse.image_url ?? null,
    searchText,
    data: mouse,
  };
}

export function compareMaybeNumber(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

export function formatDimension(value: number | null | undefined): string {
  return value != null ? `${value} mm` : "—";
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

export function formatMatchDisplay(value: string): string {
  return value === "---" ? "Pending" : value;
}

export function buildCardTags(mouse: Mouse): string[] {
  return [
    mouse.weight_g != null ? `${mouse.weight_g} g` : null,
    mouse.shape ?? null,
  ].filter((value): value is string => Boolean(value));
}

export function buildSpecEntries(mouse: Mouse): { core: SpecEntry[]; additional: SpecEntry[] } {
  const core: SpecEntry[] = [
    { label: "Brand", value: mouse.brand },
    { label: "Model", value: mouse.model },
    { label: "Variant", value: mouse.variant ?? "" },
    { label: "Availability", value: mouse.availability_status ?? "" },
    { label: "Weight", value: mouse.weight_g != null ? `${mouse.weight_g} g` : "" },
    { label: "Length", value: mouse.length_mm != null ? formatDimension(mouse.length_mm) : "" },
    { label: "Width", value: mouse.width_mm != null ? formatDimension(mouse.width_mm) : "" },
    { label: "Height", value: mouse.height_mm != null ? formatDimension(mouse.height_mm) : "" },
    { label: "Shape", value: mouse.shape ?? "" },
    { label: "Hump", value: mouse.hump ?? "" },
    { label: "Side Profile", value: mouse.side_profile ?? "" },
    { label: "Hand Compatibility", value: mouse.hand_compatibility ?? "" },
    { label: "Compatible Grips", value: mouse.grips?.join(", ") ?? "" },
    { label: "Hand Sizes", value: mouse.hands?.join(", ") ?? "" },
    { label: "Source", value: mouse.source_handle ?? "" },
    { label: "Product Link", value: mouse.product_url ?? "" },
  ].filter((entry) => entry.value);

  const additional: SpecEntry[] = [
    { label: "Shape Raw", value: mouse.shape_raw ?? "" },
    { label: "Hump Raw", value: mouse.hump_raw ?? "" },
    { label: "Hump Bucket", value: mouse.hump_bucket ?? "" },
    { label: "Front Flare", value: mouse.front_flare_raw ?? "" },
    { label: "Side Curvature", value: mouse.side_curvature_raw ?? "" },
    { label: "Brand Discount", value: mouse.brand_discount ?? "" },
    { label: "Discount Code", value: mouse.discount_code ?? "" },
    { label: "Created", value: formatDate(mouse.created_at) ?? "" },
    { label: "Updated", value: formatDate(mouse.updated_at) ?? "" },
  ].filter((entry) => entry.value);

  return { core, additional };
}
