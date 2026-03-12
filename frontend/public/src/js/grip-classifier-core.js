export const GRIP_CAPTURE_VIEWS = ["Top", "Bottom", "Side"];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeViewName(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "top" || text === "bottom" || text === "side" ? text : "";
}

function viewWeight(view) {
  return view === "side" ? 0.5 : 0.25;
}

function clawThreshold(view) {
  return view === "side" ? 150 : 148;
}

export function pipAngle(lm, mcp, pip, tip) {
  const a = { x: lm[mcp].x, y: lm[mcp].y };
  const b = { x: lm[pip].x, y: lm[pip].y };
  const c = { x: lm[tip].x, y: lm[tip].y };
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  const cos = clamp(dot / (len1 * len2 || 1), -1, 1);
  return Math.acos(cos) * 180 / Math.PI;
}

export function getFingerCurlMetrics(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const indexAngle = pipAngle(landmarks, 5, 6, 8);
  const middleAngle = pipAngle(landmarks, 9, 10, 12);
  if (!Number.isFinite(indexAngle) || !Number.isFinite(middleAngle)) return null;
  const averageAngle = (indexAngle + middleAngle) / 2;
  return {
    indexAngle,
    middleAngle,
    averageAngle,
    bendDepth: 180 - averageAngle,
  };
}

export function classifyGripFromViewLandmarks(views) {
  const entries = Object.entries(views || {})
    .map(([name, landmarks]) => {
      const view = normalizeViewName(name);
      const metrics = getFingerCurlMetrics(landmarks);
      if (!view || !metrics) return null;
      return {
        view,
        weight: viewWeight(view),
        threshold: clawThreshold(view),
        ...metrics,
      };
    })
    .filter(Boolean);

  if (!entries.length) return null;

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weightedAverageAngle =
    entries.reduce((sum, entry) => sum + entry.averageAngle * entry.weight, 0) / totalWeight;
  const sideView = entries.find((entry) => entry.view === "side") || null;
  const clawVotes = entries.filter((entry) => entry.averageAngle <= entry.threshold).length;
  const strongClawVotes = entries.filter((entry) => entry.averageAngle <= 138).length;
  const sideLooksClaw = Boolean(sideView && sideView.averageAngle <= sideView.threshold);
  const sideLooksVeryClaw = Boolean(sideView && sideView.averageAngle <= 138);
  const topBottomLooksClaw = entries.some((entry) => entry.view !== "side" && entry.averageAngle <= entry.threshold);

  const grip =
    sideLooksVeryClaw ||
    strongClawVotes >= 2 ||
    weightedAverageAngle <= 145 ||
    clawVotes >= 2 ||
    (sideLooksClaw && topBottomLooksClaw)
      ? "claw"
      : "palm";

  const baseline = entries.length >= 3 ? 0.74 : entries.length === 2 ? 0.68 : 0.62;
  const clawDistance = Math.max(0, 150 - weightedAverageAngle);
  const palmDistance = Math.max(0, weightedAverageAngle - 145);
  const confidenceBoost =
    grip === "claw"
      ? Math.min(0.18, clawDistance / 50) + strongClawVotes * 0.03
      : Math.min(0.18, palmDistance / 50);

  return {
    grip,
    score: clamp(baseline + confidenceBoost, 0.55, 0.96),
    weightedAverageAngle,
    views: entries.map((entry) => ({
      view: entry.view,
      indexAngle: entry.indexAngle,
      middleAngle: entry.middleAngle,
      averageAngle: entry.averageAngle,
    })),
  };
}

export function classifyGripFromSingleLandmarks(landmarks, viewName = "side") {
  const view = normalizeViewName(viewName) || "side";
  return classifyGripFromViewLandmarks({ [view]: landmarks });
}
