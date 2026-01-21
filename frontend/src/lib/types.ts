export type Mouse = {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  weight_g?: number | null;
  shape?: string | null;
  hump?: string | null;
  grips?: string[] | null;
  hands?: string[] | null;
  product_url?: string | null;
  image_url?: string | null;
};

export type Measurement = {
  session_id: string;
  length_mm: number;
  width_mm: number;
  length_cm: number;
  width_cm: number;
  created_at: string;
};

export type Grip = {
  session_id: string;
  grip: string;
  confidence: number;
  created_at: string;
};

export type MouseRecommendation = {
  id: string;
  brand: string;
  model: string;
  score: number;
  reason: string;
};

export type Report = {
  session_id: string;
  measurement: Measurement;
  grip?: Grip | null;
  recommendations: MouseRecommendation[];
  summary: string;
  created_at: string;
};
