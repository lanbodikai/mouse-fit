import { apiJson } from "./api-client.js";
import { loadMice as loadMiceApi } from "./mice-api.js";
import {
  RERANK_CANDIDATE_LIMIT as CORE_RERANK_CANDIDATE_LIMIT,
  buildUserProfileFromInputs,
  runDeterministicMatcher,
} from "./report-matcher-core.js";

const TOP_MATCH_LIMIT = 3;
const RERANK_CANDIDATE_LIMIT = CORE_RERANK_CANDIDATE_LIMIT;
const MIN_RETRIEVAL_POOL = 40;
const ALLOWED_GRIPS = new Set(["palm", "claw", "fingertip"]);

const idealRatio = { palm: 0.7, claw: 0.62, fingertip: 0.55 };
const idealWidthRatio = { palm: 0.7, claw: 0.68, fingertip: 0.64 };
const weightBase = { palm: 65, claw: 65, fingertip: 45 };
const heavyKnee = 81;
const BUCKET_TOLERANCE = { small: 9, medium: 10, big: 11 };
const FEATURE_WEIGHTS = { hump: 2, side: 2, shell: 1 };
const CLAMPED_NEUTRAL_REFERENCE = 65;

const PERSONAL_REFERENCE_PROFILES = {
  "claw:regular-claw": {
    label: "XM2-style regular claw",
    length: 122,
    width: 62,
    height: 38.5,
    weight: 63,
    shape: ["sym"],
    hump: ["back_high", "back"],
    side: ["inward"],
    tokens: ["xm2w", "xm2 8k", "xm2we"],
  },
  "claw:relaxed-claw": {
    label: "Maya-style relaxed claw",
    length: 119,
    width: 60,
    height: 38,
    weight: 45,
    shape: ["sym"],
    hump: ["center", "back_high", "back"],
    side: ["inward", "flat"],
    tokens: ["maya 8k", "maya"],
  },
  "claw:fingertip-claw": {
    label: "OP1-style fingertip claw",
    length: 118.2,
    width: 58.5,
    height: 37.2,
    weight: 50.5,
    shape: ["sym"],
    hump: ["back", "center"],
    side: ["flat", "inward"],
    tokens: ["op1"],
  },
  "palm:palm-claw": {
    label: "GPX2-style palm-claw",
    length: 125,
    width: 61.5,
    height: 40,
    weight: 60,
    shape: ["sym"],
    hump: ["center", "back"],
    side: ["flat", "inward"],
    tokens: ["g pro x superlight 2", "superlight 2"],
  },
  "palm:full-palm": {
    label: "DEX/DeathAdder/Viper full-palm",
    length: 127,
    width: 63.5,
    height: 42.8,
    weight: 59,
    shape: ["ergo", "sym"],
    hump: ["center", "back"],
    side: ["inward", "flat"],
    tokens: ["superlight 2 dex", "deathadder", "viper v3 pro"],
  },
  "fingertip:default": {
    label: "OP1-style fingertip",
    length: 118.2,
    width: 58.5,
    height: 37.2,
    weight: 50.5,
    shape: ["sym"],
    hump: ["back", "center"],
    side: ["flat", "inward"],
    tokens: ["op1"],
  },
};

const $status = document.getElementById("status");
const $grid = document.getElementById("grid-grip");
const $handLength = document.getElementById("handLength");
const $handWidth = document.getElementById("handWidth");
const $handSize = document.getElementById("handSize");
const $chosenGrip = document.getElementById("chosenGrip");
const $chosenGripInline = document.getElementById("chosenGripInline");
const $chosenGripTitle = document.getElementById("chosenGripTitle");
const $year = document.getElementById("y");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setStatus(message) {
  if ($status) $status.textContent = message || "";
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function readStorageValue(keys) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      if (!raw) continue;
      return raw;
    } catch {
      return null;
    }
  }
  return null;
}

function readStorageJson(keys) {
  const raw = readStorageValue(keys);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeGrip(value) {
  const grip = String(value || "").trim().toLowerCase();
  return ALLOWED_GRIPS.has(grip) ? grip : "";
}

function normalizeFingerDirection(value) {
  const direction = String(value || "").trim().toLowerCase();
  return direction === "left" || direction === "center" || direction === "right" ? direction : "";
}

function normalizeThumbPosition(value) {
  const thumb = String(value || "").trim().toLowerCase();
  return thumb === "inward" || thumb === "relaxed" ? thumb : "";
}

function normalizeYesNo(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "yes" || text === "no" ? text : "";
}

function normalizeDominantFinger(value) {
  const finger = String(value || "").trim().toLowerCase();
  return finger === "ring" || finger === "index" ? finger : "";
}

function getHandBucket(handLengthCm) {
  if (handLengthCm < 17) return "small";
  if (handLengthCm < 19) return "medium";
  return "big";
}

function getHandSize(lengthMm) {
  if (!Number.isFinite(lengthMm)) return "unknown";
  if (lengthMm < 170) return "small";
  if (lengthMm < 190) return "medium";
  if (lengthMm < 210) return "large";
  return "xlarge";
}

function formatGripLabel(grip) {
  const value = normalizeGrip(grip);
  if (!value) return "Unknown";
  if (value === "fingertip") return "Fingertip";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readMeasurementSnapshot() {
  const measure = readStorageJson(["mousefit:measure", "mf:measure"]) || {};
  const draft = readStorageJson(["mousefit:survey_draft", "mf:survey_draft"]) || {};
  const sessionLen = toFiniteNumber(readStorageValue(["mf:length_mm", "mousefit:length_mm"]));
  const sessionWid = toFiniteNumber(readStorageValue(["mf:width_mm", "mousefit:width_mm"]));
  const measureLen = toFiniteNumber(measure.len_mm ?? measure.length_mm);
  const measureWid = toFiniteNumber(measure.wid_mm ?? measure.width_mm);
  const draftLen = toFiniteNumber(draft.handLengthMm);
  const draftWid = toFiniteNumber(draft.handWidthMm);
  const length_mm = sessionLen ?? measureLen ?? draftLen ?? null;
  const width_mm = sessionWid ?? measureWid ?? draftWid ?? null;
  const size = getHandSize(length_mm ?? NaN);

  return {
    length_mm,
    width_mm,
    size,
    length_text: Number.isFinite(length_mm) ? `${(length_mm / 10).toFixed(1)} cm` : "—",
    width_text: Number.isFinite(width_mm) ? `${(width_mm / 10).toFixed(1)} cm` : "—",
  };
}

function readGripPreference() {
  const draft = readStorageJson(["mousefit:survey_draft", "mf:survey_draft"]) || {};
  const result = readStorageJson(["mousefit:grip_result", "mf:grip_result"]) || {};
  return normalizeGrip(draft.primaryGrip) || normalizeGrip(result.grip) || "palm";
}

function hydrateTopSection(grip, measurement) {
  if ($year) $year.textContent = String(new Date().getFullYear());
  if ($handLength) $handLength.textContent = measurement.length_text;
  if ($handWidth) $handWidth.textContent = measurement.width_text;
  if ($handSize) $handSize.textContent = measurement.size === "unknown" ? "Unknown" : measurement.size.toUpperCase();
  if ($chosenGrip) $chosenGrip.textContent = formatGripLabel(grip);
  if ($chosenGripInline) $chosenGripInline.textContent = formatGripLabel(grip);
  if ($chosenGripTitle) $chosenGripTitle.textContent = `${formatGripLabel(grip)} Grip Recommendations`;
}

const CHAT_RERANK_CACHE_PREFIX = "mf:report:chat-rerank:v1:";
const CHAT_RERANK_CACHE_TTL_MS = 15 * 60 * 1000;

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function buildChatRerankCacheKey(profile, localTop) {
  const profileKey = JSON.stringify({
    grip: profile.grip || "",
    handLength: Number.isFinite(profile.handLength) ? Number(profile.handLength.toFixed(1)) : null,
    handWidth: Number.isFinite(profile.handWidth) ? Number(profile.handWidth.toFixed(1)) : null,
    shell: profile.featureRequest?.requested?.shell || "",
    hump: profile.featureRequest?.requested?.hump || "",
    side: profile.featureRequest?.requested?.side || "",
    budgetMin: profile.budgetRange?.min ?? null,
    budgetMax: profile.budgetRange?.max ?? null,
  });
  const candidateKey = localTop
    .map((item) => `${String(item.id)}:${Number.isFinite(item.score) ? Number(item.score).toFixed(2) : "na"}`)
    .join("|");
  return `${CHAT_RERANK_CACHE_PREFIX}${hashString(`${profileKey}|${candidateKey}`)}`;
}

function readChatRerankCache(cacheKey) {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return Array.isArray(parsed.ranked) ? parsed.ranked : null;
  } catch {
    return null;
  }
}

function writeChatRerankCache(cacheKey, ranked) {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        expiresAt: Date.now() + CHAT_RERANK_CACHE_TTL_MS,
        ranked,
      }),
    );
  } catch {}
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (raw.startsWith("{") && raw.endsWith("}")) return raw;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return raw.slice(first, last + 1);
}

function parseChatRerankReply(reply, allowedIds) {
  const rawJson = extractJsonObject(reply);
  if (!rawJson) return null;

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed?.ranked)) return null;
  const seen = new Set();
  const ranked = [];
  for (const item of parsed.ranked) {
    const id = String(item?.id || "").trim();
    if (!id || !allowedIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    ranked.push({
      id,
      score: toFiniteNumber(item?.score),
      reason: String(item?.reason || "").trim(),
    });
  }
  return ranked.length ? ranked : null;
}

function applyChatRerank(localTop, ranked, profile) {
  const byId = new Map(localTop.map((item) => [String(item.id), item]));
  const used = new Set();
  const merged = [];

  ranked.forEach((entry) => {
    const base = byId.get(entry.id);
    if (!base) return;
    used.add(entry.id);
    merged.push({
      ...base,
      score: entry.score != null ? clamp(entry.score, 0, 100) : base.score,
      ragRating: null,
      rerankReason: entry.reason
        ? buildNaturalReasoning({
            grip: profile.grip,
            recReasoning: entry.reason,
            shapeKey: base.shapeKey,
            humpRaw: base.humpRaw,
            length: base.length,
            width: base.width,
            height: base.height,
            weight: base.weight,
            wireless: "",
          })
        : base.rerankReason || buildFallbackCardReason(base, profile.grip),
      source: "chat-rerank",
    });
  });

  localTop.forEach((item) => {
    const id = String(item.id);
    if (!used.has(id)) merged.push(item);
  });

  return merged;
}

async function rerankWithChat(profile, localRanked) {
  if (!Array.isArray(localRanked) || localRanked.length <= TOP_MATCH_LIMIT) return null;

  const localTop = localRanked.slice(0, RERANK_CANDIDATE_LIMIT);
  const cacheKey = buildChatRerankCacheKey(profile, localTop);
  const cached = readChatRerankCache(cacheKey);
  if (cached) {
    const allowedIds = new Set(localTop.map((item) => String(item.id)));
    const validCached = cached.filter((item) => item && allowedIds.has(String(item.id)));
    if (validCached.length) return applyChatRerank(localTop, validCached, profile);
  }

  const candidates = localTop.map((item) => ({
    id: String(item.id),
    local_score: Number.isFinite(item.score) ? Number(item.score.toFixed(2)) : null,
    length_mm: Number.isFinite(item.length) ? Number(item.length.toFixed(1)) : null,
    width_mm: Number.isFinite(item.width) ? Number(item.width.toFixed(1)) : null,
    height_mm: Number.isFinite(item.height) ? Number(item.height.toFixed(1)) : null,
    weight_g: Number.isFinite(item.weight) ? Number(item.weight.toFixed(1)) : null,
    shape: item.shapeKey || "",
    hump: item.humpRaw || "",
    side: item.sideKey || "",
  }));
  const allowedIds = new Set(candidates.map((item) => item.id));

  const messages = [
    {
      role: "system",
      content:
        "You rerank mouse candidates for fit. Return STRICT JSON only with shape {\"ranked\":[{\"id\":\"...\",\"score\":0-100,\"reason\":\"...\"}]}. Do not include ids outside the input list.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          profile: {
            grip: profile.grip || "palm",
            hand_length_mm: Number.isFinite(profile.handLength) ? Number(profile.handLength.toFixed(1)) : null,
            hand_width_mm: Number.isFinite(profile.handWidth) ? Number(profile.handWidth.toFixed(1)) : null,
            feature_request: profile.featureRequest?.requested || {},
          },
          candidates,
        },
        null,
        2,
      ),
    },
  ];

  const response = await apiJson("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages,
      temperature: 0.2,
    }),
  });

  const ranked = parseChatRerankReply(response?.reply, allowedIds);
  if (!ranked) return null;
  writeChatRerankCache(cacheKey, ranked);
  return applyChatRerank(localTop, ranked, profile);
}

function readBudgetRange() {
  const fromCompat = readStorageJson(["mousefit:recs", "mf:recs"]) || {};
  const compatMin = toFiniteNumber(fromCompat.budget_min);
  const compatMax = toFiniteNumber(fromCompat.budget_max);
  if (compatMin != null && compatMax != null) {
    return { min: Math.min(compatMin, compatMax), max: Math.max(compatMin, compatMax) };
  }

  const draft = readStorageJson(["mousefit:survey_draft", "mf:survey_draft"]);
  if (!draft) return null;
  const draftMin = toFiniteNumber(draft?.budgetMin);
  const draftMax = toFiniteNumber(draft?.budgetMax);
  if (draftMin == null || draftMax == null) return null;
  return { min: Math.min(draftMin, draftMax), max: Math.max(draftMin, draftMax) };
}

function readSurveySelections() {
  const draft = readStorageJson(["mousefit:survey_draft", "mf:survey_draft"]) || {};
  return {
    primaryGrip: normalizeGrip(draft.primaryGrip),
    shellShape: String(draft.shellShape || "").trim().toLowerCase(),
    humpPosition: String(draft.humpPosition || "").trim().toLowerCase(),
    sideShape: String(draft.sideShape || "").trim().toLowerCase(),
    fingerDirection: normalizeFingerDirection(draft.fingerDirection),
    thumbPosition: normalizeThumbPosition(draft.thumbPosition),
    dominantFinger: normalizeDominantFinger(draft.dominantFinger),
    palmFingerCurved: normalizeYesNo(draft.palmFingerCurved),
    clawRelaxed: normalizeYesNo(draft.clawRelaxed),
    clawBackHandTouch: normalizeYesNo(draft.clawBackHandTouch),
  };
}

function buildFeatureRequest(selections) {
  const requested = {};
  const labels = [];

  if (selections.shellShape === "ergo" || selections.shellShape === "sym") {
    requested.shell = selections.shellShape;
    labels.push(`${selections.shellShape} shell`);
  }
  if (selections.humpPosition === "back" || selections.humpPosition === "center") {
    requested.hump = selections.humpPosition;
    labels.push(selections.humpPosition === "back" ? "back hump" : "center hump");
  }
  if (selections.sideShape === "inward" || selections.sideShape === "flat") {
    requested.side = selections.sideShape;
    labels.push(selections.sideShape === "inward" ? "inward/slanted side" : "flat side");
  }

  return { requested, labels, count: labels.length };
}

function derivePersonalizedSizing({
  grip,
  clawSubtype,
  palmSubtype,
  handLength,
  handWidth,
  isSlantedHand,
  inwardThumb,
  baseTargetLength,
  baseTargetWidth,
}) {
  const lengthScale = (handLength - 180) * 0.55;
  const widthScale = (handWidth - 85) * 0.65;

  let targetLength = baseTargetLength;
  let targetWidth = baseTargetWidth;
  let minLength = targetLength - 9;
  let minWidth = targetWidth - 4.5;
  let maxWidth = targetWidth + 6;
  const notes = [];

  if (grip === "claw") {
    if (clawSubtype === "regular-claw") {
      targetLength = 120 + lengthScale;
      targetWidth = (isSlantedHand ? 62 : 60) + widthScale;
      minLength = 117 + lengthScale * 0.65;
      minWidth = (isSlantedHand ? 60.5 : 59) + widthScale * 0.8;
      maxWidth = (isSlantedHand ? 65.5 : 63.5) + widthScale;
      notes.push("regular claw target band (~120mm x 60-62mm grip width)");
    } else if (clawSubtype === "relaxed-claw") {
      targetLength = 119 + lengthScale * 0.9;
      targetWidth = (isSlantedHand ? 61 : 60) + widthScale * 0.95;
      minLength = 115 + lengthScale * 0.65;
      minWidth = (isSlantedHand ? 59 : 58.5) + widthScale * 0.75;
      maxWidth = (isSlantedHand ? 64.5 : 63.2) + widthScale;
      notes.push("relaxed claw target band (mid-size shell)");
    } else if (clawSubtype === "fingertip-claw") {
      targetLength = 117 + lengthScale * 0.8;
      targetWidth = (inwardThumb ? 58 : 59.5) + widthScale * 0.9;
      minLength = 113 + lengthScale * 0.6;
      minWidth = (inwardThumb ? 56.5 : 58) + widthScale * 0.7;
      maxWidth = (inwardThumb ? 61.5 : 62.5) + widthScale * 0.9;
      notes.push("fingertip-claw target band (narrower grip width)");
    }
  } else if (grip === "palm") {
    if (palmSubtype === "palm-claw") {
      targetLength = 125 + lengthScale * 0.8;
      targetWidth = (isSlantedHand ? 64 : 63) + widthScale;
      minLength = 122 + lengthScale * 0.6;
      minWidth = (isSlantedHand ? 62 : 61) + widthScale * 0.85;
      maxWidth = (isSlantedHand ? 67.5 : 66) + widthScale;
      notes.push("palm-claw target band (~125mm x 63-64mm grip width)");
    } else {
      targetLength = 126 + lengthScale * 0.85;
      targetWidth = (isSlantedHand ? 64 : 63) + widthScale;
      minLength = 125 + lengthScale * 0.65;
      minWidth = 61 + widthScale * 0.8;
      maxWidth = (isSlantedHand ? 68 : 66.5) + widthScale;
      notes.push("full palm target band (125mm+ length)");
    }
  } else {
    targetLength = 115 + lengthScale * 0.75;
    targetWidth = (inwardThumb ? 58 : 59.5) + widthScale * 0.85;
    minLength = 109 + lengthScale * 0.55;
    minWidth = (inwardThumb ? 56.5 : 58) + widthScale * 0.7;
    maxWidth = (inwardThumb ? 61 : 62.5) + widthScale * 0.9;
    notes.push("fingertip target band (compact/narrow profile)");
  }

  if (isSlantedHand && inwardThumb) {
    targetWidth -= 1.4;
    minWidth -= 1.6;
    maxWidth -= 0.4;
    notes.push("slanted + inward thumb allows narrower grip-width profile");
  }

  const hardMinLength = grip === "palm" ? minLength : minLength - 1.2;
  const hardMinWidth = minWidth - 0.8;

  return {
    targetLength,
    targetWidth,
    minLength,
    minWidth,
    maxWidth,
    hardMinLength,
    hardMinWidth,
    notes,
  };
}

function buildUserProfile() {
  const measurement = readMeasurementSnapshot();
  const gripFromStorage = readGripPreference();
  const selections = readSurveySelections();
  return buildUserProfileFromInputs({
    measurement,
    gripFromStorage,
    selections,
    budgetRange: readBudgetRange(),
  });
}

async function loadMice() {
  try {
    const mice = await loadMiceApi();
    if (Array.isArray(mice) && mice.length) return mice;
  } catch (error) {
    console.warn("Mice API fetch failed", error);
  }
  return window.MICE || window.mice || [];
}

const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const toName = (mouse) =>
  mouse.name ||
  [mouse.brand || mouse.make || mouse.maker || "", mouse.model || mouse.title || ""].filter(Boolean).join(" ").trim() ||
  "Unknown";

function getDims(mouse) {
  let length = mouse.length ?? mouse.length_mm ?? mouse.L ?? mouse.dimL;
  let width = mouse.width ?? mouse.width_mm ?? mouse.W ?? mouse.dimW;
  let height = mouse.height ?? mouse.height_mm ?? mouse.H ?? mouse.dimH;

  if ((!length || !width || !height) && mouse.spec) {
    const match = String(mouse.spec).match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
    if (match) {
      length = Number(match[1]);
      width = Number(match[2]);
      height = Number(match[3]);
    }
  }
  return {
    L: Number(length) || 0,
    W: Number(width) || 0,
    H: Number(height) || 0,
  };
}

function getWeight(mouse) {
  let grams = mouse.weight ?? mouse.weight_g;
  if (!grams && mouse.spec) {
    const match = String(mouse.spec).match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (match) grams = Number(match[1]);
  }
  return Number(grams) || 0;
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  const numeric = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getPrice(mouse) {
  const candidates = [mouse.price_usd, mouse.price, mouse.usd, mouse.msrp, mouse.priceUsd, mouse.priceUSD, mouse.retail_price, mouse.retailPrice];
  for (const value of candidates) {
    const parsed = parsePrice(value);
    if (parsed != null) return parsed;
  }

  const specText = [mouse.spec, mouse.notes, mouse.description].filter(Boolean).join(" ");
  if (!specText) return null;

  const match = specText.match(/\$\s*(\d+(?:\.\d+)?)/) || specText.match(/(\d+(?:\.\d+)?)\s*usd/i);
  if (!match) return null;
  return parsePrice(match[1]);
}

function normalizeShape(value) {
  const shape = String(value || "").trim().toLowerCase();
  if (!shape || shape === "-") return "other";
  if (shape.includes("ergo")) return "ergo";
  if (shape.includes("sym") || shape.includes("ambi")) return "sym";
  if (shape.includes("hybrid")) return "hybrid";
  return "other";
}

function normalizeHump(value) {
  const hump = String(value || "").trim().toLowerCase();
  if (!hump || hump === "-") return "other";
  if (/back|rear/.test(hump) && /aggressive|high|tall|huge|pronounced/.test(hump)) return "back_high";
  if (/back|rear/.test(hump)) return "back";
  if (/center|middle|mid/.test(hump)) return "center";
  return "other";
}

function humpMatchesRequested(humpKey, requested) {
  if (!requested) return true;
  if (requested === "back") return humpKey === "back" || humpKey === "back_high";
  if (requested === "center") return humpKey === "center";
  return humpKey === requested;
}

function normalizeSide(value) {
  const side = String(value || "").trim().toLowerCase();
  if (!side || side === "-") return "other";
  if (/inward|concave|curve|slant/.test(side)) return "inward";
  if (/flat|straight/.test(side)) return "flat";
  if (/outward|convex/.test(side)) return "outward";
  return "other";
}

function estimateGripWidth(width, sideKey) {
  if (!Number.isFinite(width) || width <= 0) return 0;
  const inset = sideKey === "inward" ? 4 : sideKey === "flat" ? 2 : sideKey === "outward" ? 1 : 2.5;
  return clamp(width - inset, 0, 100);
}

function normalizeMouse(mouse) {
  const name = toName(mouse);
  const { L, W, H } = getDims(mouse);
  const weight = getWeight(mouse);
  const price = getPrice(mouse);
  const shapeKey = normalizeShape(mouse.shape);
  const humpKey = normalizeHump(mouse.hump);
  const sideKey = normalizeSide(mouse.side_curvature);
  const gripWidthEstimate = estimateGripWidth(W, sideKey);
  const id = mouse.id || slug(name);

  return {
    id,
    name,
    brand: String(mouse.brand || ""),
    model: String(mouse.model || ""),
    nameKey: `${String(mouse.brand || "")} ${String(mouse.model || "")} ${name}`.toLowerCase(),
    length: L,
    width: W,
    gripWidthEstimate,
    height: H,
    weight,
    price,
    shapeKey,
    humpKey,
    sideKey,
    shapeRaw: String(mouse.shape || ""),
    humpRaw: String(mouse.hump || ""),
    sideRaw: String(mouse.side_curvature || ""),
  };
}

function humpMatchList(humpKey, allowed) {
  if (!Array.isArray(allowed) || !allowed.length) return false;
  return allowed.some((target) => humpMatchesRequested(humpKey, target));
}

function referenceProfileFor(profile) {
  if (profile.grip === "claw") {
    const key = `claw:${profile.clawSubtype || "regular-claw"}`;
    return PERSONAL_REFERENCE_PROFILES[key] || null;
  }
  if (profile.grip === "palm") {
    const key = `palm:${profile.palmSubtype || "full-palm"}`;
    return PERSONAL_REFERENCE_PROFILES[key] || null;
  }
  return PERSONAL_REFERENCE_PROFILES["fingertip:default"] || null;
}

function humpSubscore(mouse, profile, feature) {
  let score = 68;

  if (profile.grip === "claw") {
    if (profile.clawSubtype === "regular-claw") {
      if (mouse.humpKey === "back_high") score = 100;
      else if (mouse.humpKey === "back") score = 92;
      else if (mouse.humpKey === "center") score = 60;
      else score = 48;
      if (mouse.humpKey === "back" && mouse.height >= 38) score += 5;
      if (mouse.height < 36.5) score -= 14;
    } else if (profile.clawSubtype === "relaxed-claw") {
      if (mouse.humpKey === "center") score = 98;
      else if (mouse.humpKey === "back_high") score = 94;
      else if (mouse.humpKey === "back") score = 84;
      else score = 52;
      if (mouse.height > 43) score -= 8;
    } else if (profile.clawSubtype === "fingertip-claw") {
      if (mouse.humpKey === "center") score = 84;
      else if (mouse.humpKey === "back") score = 76;
      else if (mouse.humpKey === "back_high") score = 48;
      else score = 56;
      if (mouse.height >= 40) score -= 14;
    } else {
      score = mouse.humpKey === "back" || mouse.humpKey === "back_high" ? 88 : 66;
    }
  } else if (profile.grip === "palm") {
    if (mouse.humpKey === "center") score = 92;
    else if (mouse.humpKey === "back") score = 84;
    else if (mouse.humpKey === "back_high") score = 72;
    else score = 60;
  } else {
    if (mouse.humpKey === "back_high") score = 44;
    else if (mouse.humpKey === "center") score = 86;
    else if (mouse.humpKey === "back") score = 78;
    else score = 64;
  }

  if (profile.featureRequest.requested.hump) {
    score += humpMatchesRequested(mouse.humpKey, profile.featureRequest.requested.hump) ? 6 : -18;
  }

  score -= feature.distance * 6;
  return clamp(score, 0, 100);
}

function referenceSimilaritySubscore(mouse, profile) {
  if (!profile.isReferenceArchetype) return CLAMPED_NEUTRAL_REFERENCE;
  const ref = referenceProfileFor(profile);
  if (!ref) return CLAMPED_NEUTRAL_REFERENCE;

  const lengthScore = scoreFromTolerance(Math.abs(mouse.length - ref.length), 2.8, 13);
  const widthScore = scoreFromTolerance(Math.abs(mouse.gripWidthEstimate - ref.width), 2.2, 8.5);
  const heightScore = scoreFromTolerance(Math.abs(mouse.height - ref.height), 1.4, 8);
  const weightScore = scoreFromTolerance(Math.abs((mouse.weight || ref.weight) - ref.weight), 4, 22);

  let score = 0.38 * lengthScore + 0.24 * widthScore + 0.2 * heightScore + 0.18 * weightScore;

  if (Array.isArray(ref.shape) && ref.shape.length) {
    score += ref.shape.includes(mouse.shapeKey) ? 7 : -8;
  }
  if (humpMatchList(mouse.humpKey, ref.hump)) score += 8;
  else score -= 8;
  if (Array.isArray(ref.side) && ref.side.includes(mouse.sideKey)) score += 6;
  else score -= 5;

  if (Array.isArray(ref.tokens) && ref.tokens.some((token) => mouse.nameKey.includes(token))) {
    score += 7;
  }

  return clamp(score, 0, 100);
}

function filterOutliers(mice) {
  return mice.filter((mouse) => {
    if (!(mouse.length > 0 && mouse.width > 0 && mouse.height > 0)) return false;
    if (mouse.length < 70 || mouse.length > 140) return false;
    if (mouse.width > 90) return false;
    if (mouse.height > 60) return false;
    if (mouse.shapeKey === "other") return false;
    return true;
  });
}

function filterMiceByBudget(mice, range) {
  if (!range) return { list: mice, mode: "no-budget" };

  const withPrice = mice.filter((mouse) => Number.isFinite(mouse.price) && mouse.price > 0);
  if (!withPrice.length) return { list: mice, mode: "no-price-data" };

  const inRange = withPrice.filter((mouse) => mouse.price >= range.min && mouse.price <= range.max);
  return { list: inRange, mode: "filtered" };
}

function retrieveByHandBucket(mice, profile) {
  const baseTolerance = BUCKET_TOLERANCE[profile.handBucket] ?? 10;
  const baseWidthTolerance = profile.handBucket === "small" ? 3.8 : profile.handBucket === "medium" ? 4.2 : 4.6;
  let usedTolerance = baseTolerance;
  let usedWidthTolerance = baseWidthTolerance;

  const withinProfileBand = (mouse, lengthTol, widthTol) => {
    if (mouse.length < profile.hardMinLength) return false;
    if (mouse.gripWidthEstimate < profile.hardMinWidth) return false;
    if (Math.abs(mouse.length - profile.targetLength) > lengthTol) return false;
    if (Math.abs(mouse.gripWidthEstimate - profile.targetWidth) > widthTol) return false;
    if (mouse.length < profile.minLength - 1.5) return false;
    if (mouse.gripWidthEstimate < profile.minWidth - 1.3) return false;
    if (mouse.gripWidthEstimate > profile.maxWidth + 2.2) return false;
    return true;
  };

  let pool = mice.filter((mouse) => withinProfileBand(mouse, usedTolerance, usedWidthTolerance));
  let expanded = false;

  if (pool.length < MIN_RETRIEVAL_POOL) {
    usedTolerance += 4;
    usedWidthTolerance += 1.6;
    expanded = true;
    pool = mice.filter((mouse) => withinProfileBand(mouse, usedTolerance, usedWidthTolerance));
  }

  if (!pool.length) {
    const fallbackPool = mice.filter(
      (mouse) => mouse.length >= profile.hardMinLength && mouse.gripWidthEstimate >= profile.hardMinWidth,
    );
    const source = fallbackPool.length ? fallbackPool : mice;
    pool = source
      .slice()
      .sort((a, b) => {
        const da =
          Math.abs(a.length - profile.targetLength) * 1.1 + Math.abs(a.gripWidthEstimate - profile.targetWidth) * 1.25;
        const db =
          Math.abs(b.length - profile.targetLength) * 1.1 + Math.abs(b.gripWidthEstimate - profile.targetWidth) * 1.25;
        return da - db;
      })
      .slice(0, Math.min(120, source.length));
  }

  return { list: pool, usedTolerance, usedWidthTolerance, expanded };
}

function calcFeatureDistance(mouse, featureRequest) {
  if (!featureRequest.count) {
    return { distance: 0, mismatchCount: 0, mismatchedLabels: [] };
  }

  let distance = 0;
  let mismatchCount = 0;
  const mismatchedLabels = [];

  if (featureRequest.requested.shell && mouse.shapeKey !== featureRequest.requested.shell) {
    distance += FEATURE_WEIGHTS.shell;
    mismatchCount += 1;
    mismatchedLabels.push("shell shape");
  }
  if (featureRequest.requested.hump && mouse.humpKey !== featureRequest.requested.hump) {
    if (!humpMatchesRequested(mouse.humpKey, featureRequest.requested.hump)) {
      distance += FEATURE_WEIGHTS.hump;
      mismatchCount += 1;
      mismatchedLabels.push("hump position");
    }
  }
  if (featureRequest.requested.side && mouse.sideKey !== featureRequest.requested.side) {
    distance += FEATURE_WEIGHTS.side;
    mismatchCount += 1;
    mismatchedLabels.push("side profile");
  }

  return { distance, mismatchCount, mismatchedLabels };
}

function applyStrictFeatureFilters(mice, featureRequest) {
  if (!featureRequest.count) {
    return { list: mice.slice(), mode: "strict" };
  }
  const strict = mice.filter((mouse) => calcFeatureDistance(mouse, featureRequest).mismatchCount === 0);
  return { list: strict, mode: "strict" };
}

function unionRelaxedLabels(candidates) {
  const set = new Set();
  candidates.slice(0, 40).forEach((entry) => {
    entry.feature.mismatchedLabels.forEach((label) => set.add(label));
  });
  return Array.from(set);
}

function expandWithRelaxedFilters(mice, featureRequest) {
  if (!mice.length) return { list: [], mode: "none", relaxedLabels: [] };
  if (!featureRequest.count) return { list: mice.slice(), mode: "strict", relaxedLabels: [] };

  const annotated = mice
    .map((mouse) => ({ mouse, feature: calcFeatureDistance(mouse, featureRequest) }))
    .sort((a, b) => {
      if (a.feature.mismatchCount !== b.feature.mismatchCount) return a.feature.mismatchCount - b.feature.mismatchCount;
      return a.feature.distance - b.feature.distance;
    });

  const pass1 = annotated.filter((entry) => entry.feature.mismatchCount <= 1);
  if (pass1.length) {
    return {
      list: pass1.map((entry) => entry.mouse),
      mode: "fallback-pass1",
      relaxedLabels: unionRelaxedLabels(pass1),
    };
  }

  const pass2 = annotated.filter((entry) => entry.feature.mismatchCount <= 2);
  if (pass2.length) {
    return {
      list: pass2.map((entry) => entry.mouse),
      mode: "fallback-pass2",
      relaxedLabels: unionRelaxedLabels(pass2),
    };
  }

  return {
    list: annotated.map((entry) => entry.mouse),
    mode: "fallback-nearest",
    relaxedLabels: unionRelaxedLabels(annotated),
  };
}

function scoreFromTolerance(diff, goodTol, hardTol) {
  if (diff <= goodTol) return 100;
  if (diff >= hardTol) return 0;
  const ratio = (diff - goodTol) / (hardTol - goodTol);
  return 100 * (1 - ratio * ratio);
}

function scoreBand(value, idealLo, idealHi, softLo, softHi, hardLo, hardHi) {
  if (!Number.isFinite(value) || value <= 0) return 60;
  if (value >= idealLo && value <= idealHi) return 100;

  if (value < idealLo) {
    if (value >= softLo) return 80 + ((value - softLo) / (idealLo - softLo)) * 20;
    if (value >= hardLo) return ((value - hardLo) / (softLo - hardLo)) * 80;
    return 0;
  }

  if (value <= softHi) return 80 + ((softHi - value) / (softHi - idealHi)) * 20;
  if (value <= hardHi) return ((hardHi - value) / (hardHi - softHi)) * 80;
  return 0;
}

function lengthSubscore(mouse, profile, retrieval) {
  const diff = Math.abs(mouse.length - profile.targetLength);
  const goodTol = profile.handBucket === "small" ? 3.5 : profile.handBucket === "medium" ? 4 : 4.5;
  const hardTol = retrieval.usedTolerance + 8;
  return scoreFromTolerance(diff, goodTol, hardTol);
}

function widthSubscore(mouse, profile) {
  const diff = Math.abs(mouse.gripWidthEstimate - profile.targetWidth);
  const goodTol = profile.grip === "claw" ? 1.6 : profile.grip === "palm" ? 1.8 : 1.5;
  return scoreFromTolerance(diff, goodTol, 8.5);
}

function heightSubscore(mouse, grip) {
  if (grip === "palm") return scoreBand(mouse.height, 39, 44, 37, 46, 34, 50);
  if (grip === "claw") return scoreBand(mouse.height, 38.5, 41, 37, 42, 34, 44.5);
  return scoreBand(mouse.height, 33, 38, 32, 39.5, 29, 41.5);
}

function weightSubscore(mouse, grip) {
  const weight = mouse.weight || 0;
  const base = weightBase[grip];
  if (!weight) return 62;
  if (weight <= base) return clamp(100 - (base - weight) * 0.3, 84, 100);

  const slope = grip === "fingertip" ? 1.9 : grip === "claw" ? 1.15 : 0.95;
  const extraSlope = grip === "fingertip" ? 2.4 : grip === "claw" ? 1.6 : 1.3;
  const over = weight - base;
  let penalty = over * slope;
  if (weight > heavyKnee) penalty += (weight - heavyKnee) * extraSlope;
  return clamp(100 - penalty, 0, 100);
}

function shapeSideSubscore(mouse, profile, feature) {
  let score = 72;

  if (profile.grip === "palm") {
    if (profile.palmSubtype === "palm-claw") {
      if (mouse.shapeKey === "sym") score += 9;
      if (mouse.shapeKey === "ergo") score += 7;
    } else {
      if (mouse.shapeKey === "ergo") score += 11;
      if (mouse.shapeKey === "sym") score += 5;
    }
  } else if (profile.grip === "claw") {
    if (profile.clawSubtype === "regular-claw") {
      if (mouse.shapeKey === "sym") score += 11;
      if (mouse.shapeKey === "hybrid") score += 4;
      if (mouse.shapeKey === "ergo") score -= 2;
    } else if (profile.clawSubtype === "relaxed-claw") {
      if (mouse.shapeKey === "sym") score += 9;
      if (mouse.shapeKey === "hybrid") score += 6;
      if (mouse.shapeKey === "ergo") score += 2;
    } else {
      if (mouse.shapeKey === "sym") score += 10;
      if (mouse.shapeKey === "hybrid") score += 3;
      if (mouse.shapeKey === "ergo") score -= 4;
    }
  } else {
    if (mouse.shapeKey === "sym") score += 10;
    if (mouse.shapeKey === "hybrid") score += 4;
    if (mouse.shapeKey === "ergo") score -= 18;
  }

  if (profile.inwardThumb) {
    if (mouse.sideKey === "inward") score += 12;
    if (mouse.sideKey === "flat") score -= 5;
    if (mouse.sideKey === "outward") score -= 12;
  } else if (profile.isSlantedHand) {
    if (mouse.sideKey === "inward") score += 7;
    if (mouse.sideKey === "flat") score += 2;
  } else if (profile.grip === "palm" && mouse.sideKey === "flat") {
    score += 4;
  }

  score -= feature.distance * 11;
  if (feature.mismatchCount === 0 && profile.featureRequest.count) score += 4;
  return clamp(score, 0, 100);
}

function postureBonus(mouse, profile) {
  let bonus = 0;

  if (profile.isSlantedHand) {
    if (mouse.length >= profile.targetLength && mouse.length <= profile.targetLength + 8) bonus += 4;
    if (mouse.gripWidthEstimate >= profile.targetWidth) bonus += 2;
    if (mouse.length < profile.targetLength - 4) bonus -= 3;
  }

  if (profile.inwardThumb) {
    if (mouse.length <= profile.targetLength + 1) bonus += 3;
    else bonus -= 2;

    if (mouse.gripWidthEstimate <= profile.targetWidth + 1.2) bonus += 3;
    else bonus -= 2;

    if (mouse.sideKey === "inward") bonus += 2;
  }

  if (profile.grip === "claw" && profile.clawSubtype === "regular-claw") {
    if (mouse.humpKey === "back_high") bonus += 4;
    else if (mouse.humpKey === "back") bonus += 2;
    else bonus -= 2;
  }

  if (profile.fingerDirection === "right" && mouse.sideKey === "inward") bonus += 1;
  if (profile.fingerDirection === "left" && mouse.sideKey === "inward") bonus += 1;

  return clamp(bonus, -12, 12);
}

function scoreMouseFit(mouse, profile, retrieval, feature) {
  const lengthScore = lengthSubscore(mouse, profile, retrieval);
  const widthScore = widthSubscore(mouse, profile);
  const heightScore = heightSubscore(mouse, profile.grip);
  const weightScore = weightSubscore(mouse, profile.grip);
  const shapeSideScore = shapeSideSubscore(mouse, profile, feature);
  const humpScore = humpSubscore(mouse, profile, feature);
  const referenceScore = referenceSimilaritySubscore(mouse, profile);
  const posture = postureBonus(mouse, profile);

  let total =
    0.3 * lengthScore +
    0.16 * widthScore +
    0.2 * heightScore +
    0.14 * weightScore +
    0.1 * shapeSideScore +
    0.1 * humpScore;

  total += posture;
  total -= feature.distance * 2.2;
  if (mouse.length < profile.minLength) total -= (profile.minLength - mouse.length) * 5.2;
  if (mouse.gripWidthEstimate < profile.minWidth) total -= (profile.minWidth - mouse.gripWidthEstimate) * 6.8;
  if (mouse.gripWidthEstimate > profile.maxWidth + 0.6) total -= (mouse.gripWidthEstimate - profile.maxWidth) * 2.7;
  if (profile.isReferenceArchetype) total += 0.08 * (referenceScore - CLAMPED_NEUTRAL_REFERENCE);

  return {
    score: clamp(total, 0, 100),
    feature,
    breakdown: {
      lengthScore,
      widthScore,
      heightScore,
      weightScore,
      shapeSideScore,
      humpScore,
      referenceScore,
      posture,
    },
  };
}

function rankAndSelectTop(mice, profile, retrieval, limit = TOP_MATCH_LIMIT) {
  return mice
    .map((mouse) => {
      const feature = calcFeatureDistance(mouse, profile.featureRequest);
      const scored = scoreMouseFit(mouse, profile, retrieval, feature);
      return { ...mouse, ...scored };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(limit, 0));
}

function chipClass(grip) {
  return grip === "palm" ? "bg-palm" : grip === "claw" ? "bg-claw" : "bg-tip";
}

function shapeLabel(shapeKey) {
  if (shapeKey === "ergo") return "Ergo";
  if (shapeKey === "sym") return "Sym";
  if (shapeKey === "hybrid") return "Hybrid";
  return "Other";
}

function buildNaturalReasoning({ grip, recReasoning, shapeKey, humpRaw, length, width, height, weight, wireless }) {
  const gripLabel = grip === "fingertip" ? "fingertip" : grip || "your";
  const shapeText = shapeLabel(shapeKey).toLowerCase();
  const dims =
    Number.isFinite(length) && Number.isFinite(width) && Number.isFinite(height)
      ? `${length.toFixed(1)} x ${width.toFixed(1)} x ${height.toFixed(1)} mm`
      : "a practical size";
  const weightText = Number.isFinite(weight) && weight > 0 ? `${Math.round(weight)}g` : "a balanced weight";
  const humpText = humpRaw ? `${String(humpRaw).toLowerCase()} hump` : "balanced hump";
  const connectionText = wireless === "wireless" ? "wireless setup" : wireless === "wired" ? "wired setup" : "setup";

  const base = `This ${shapeText} shape with a ${humpText} should feel stable for ${gripLabel} grip, and the ${dims} body at ${weightText} is a solid fit for your ${connectionText}.`;
  if (!recReasoning) return base;

  const cleaned = String(recReasoning)
    .replace(/Similarity score:\s*[-+]?\d*\.?\d+/gi, "")
    .replace(/Query match:\s*`[^`]*`\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return base;
  return `${base} ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

function buildFallbackCardReason(item, grip) {
  const shapeText = shapeLabel(item.shapeKey).toLowerCase();
  const humpText = item.humpRaw ? `${String(item.humpRaw).toLowerCase()} hump` : "balanced hump";
  const weightText = Number.isFinite(item.weight) && item.weight > 0 ? `${Math.round(item.weight)}g weight` : "balanced weight";
  const gripText = grip === "fingertip" ? "fingertip" : grip || "your";
  return `This ${shapeText} shell with a ${humpText} and ${weightText} should feel comfortable and controlled for your ${gripText} grip style.`;
}

function renderGrid(el, items, grip) {
  if (!el) return;
  el.innerHTML = "";
  if (!items.length) {
    el.innerHTML = '<div style="grid-column:1/-1; opacity:0.6;">No matches found for your selected filters.</div>';
    return;
  }

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `chip ${chipClass(grip)} ${idx === 0 ? "best" : ""}`;
    const reasonText = item.rerankReason ? String(item.rerankReason) : buildFallbackCardReason(item, grip);
    const reasonLabel = `<div class="reason">${reasonText}</div>`;
    const pctLabel = Number.isFinite(item.ragRating) ? `${Math.round(item.ragRating * 10)}%` : `${Math.round(item.score)}%`;
    const signalBits = [];
    if (Number.isFinite(item.weight) && item.weight > 0) signalBits.push(`${Math.round(item.weight)}g`);
    if (item.shapeKey) signalBits.push(shapeLabel(item.shapeKey));
    if (item.humpRaw) signalBits.push(`${item.humpRaw} hump`);
    const supportLine = signalBits.length ? signalBits.join(" • ") : "Fit reasoning";

    card.innerHTML = `
      <div class="pct">${pctLabel}</div>
      <div>${item.name}</div>
      <div class="meta">${supportLine}</div>
      ${reasonLabel}
    `;
    el.appendChild(card);
  });
}

function describeMode(mode, relaxedLabels) {
  if (mode === "strict") return "strict feature matching (no fallback needed)";
  if (mode === "fallback-pass1") {
    const suffix = relaxedLabels.length ? `, relaxing one feature where needed (${relaxedLabels.join(", ")})` : "";
    return `fallback pass 1${suffix}`;
  }
  if (mode === "fallback-pass2") {
    const suffix = relaxedLabels.length ? `, relaxing up to two features (${relaxedLabels.join(", ")})` : "";
    return `fallback pass 2${suffix}`;
  }
  if (mode === "fallback-nearest") return "fallback pass 3 using nearest-feature retrieval";
  return "fallback retrieval";
}

function getOrCreateSessionId() {
  const key = "mousefit:v2:session_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return `session-${Date.now()}`;
  }
}

function measurementFromServer(reportMeasurement) {
  const lengthMm = toFiniteNumber(reportMeasurement?.length_mm);
  const widthMm = toFiniteNumber(reportMeasurement?.width_mm);
  const size = getHandSize(lengthMm ?? NaN);
  return {
    length_mm: lengthMm,
    width_mm: widthMm,
    size,
    length_text: Number.isFinite(lengthMm) ? `${(lengthMm / 10).toFixed(1)} cm` : "—",
    width_text: Number.isFinite(widthMm) ? `${(widthMm / 10).toFixed(1)} cm` : "—",
  };
}

function hasSurveyDraftData() {
  const draft = readStorageJson(["mousefit:survey_draft", "mf:survey_draft"]);
  return Boolean(draft && typeof draft === "object");
}

function normalizeServerRecommendations(report, grip) {
  const list = Array.isArray(report?.recommendations) ? report.recommendations : [];
  return list.slice(0, TOP_MATCH_LIMIT).map((entry) => {
    const name = `${entry?.brand || ""} ${entry?.model || ""}`.trim() || String(entry?.id || "Unknown");
    const rawScore = toFiniteNumber(entry?.score) ?? 0;
    return {
      id: String(entry?.id || slug(name)),
      name,
      score: clamp(rawScore, 0, 100),
      ragRating: null,
      shapeKey: "other",
      humpRaw: "",
      weight: 0,
      rerankReason: String(entry?.reason || report?.summary || ""),
      grip,
    };
  });
}

async function tryServerReport(grip) {
  const sessionId = getOrCreateSessionId();
  const encoded = encodeURIComponent(sessionId);

  await apiJson(`/api/report/generate?session_id=${encoded}`, { method: "POST" });
  const latest = await apiJson(`/api/report/latest?session_id=${encoded}`);
  try {
    localStorage.setItem("mousefit:latest_report", JSON.stringify(latest));
  } catch {}

  const effectiveGrip = normalizeGrip(latest?.grip?.grip || grip) || grip || "palm";
  const measurement = measurementFromServer(latest?.measurement || {});
  hydrateTopSection(effectiveGrip, measurement);
  const recs = normalizeServerRecommendations(latest, effectiveGrip);
  renderGrid($grid, recs, effectiveGrip);
  setStatus(String(latest?.summary || "Server report generated."));
  return true;
}

async function generateReport() {
  try {
    const profile = buildUserProfile();
    const measurement = readMeasurementSnapshot();
    hydrateTopSection(profile.grip, measurement);

    const useServerPipelineFlag = Boolean(window.__MOUSEFIT_FLAGS__?.USE_SERVER_REPORT_PIPELINE ?? false);
    const useServerPipeline = useServerPipelineFlag && !hasSurveyDraftData();
    if (useServerPipeline) {
      try {
        setStatus("Generating report from server...");
        const ok = await tryServerReport(profile.grip);
        if (ok) return;
      } catch (error) {
        console.warn("Server report pipeline failed; falling back.", error);
      }
    }

    if (!Number.isFinite(measurement.length_mm) || !Number.isFinite(measurement.width_mm)) {
      setStatus("Missing measurement data. Run the survey again from Redo Test.");
      renderGrid($grid, [], profile.grip);
      return;
    }

    setStatus("Loading mice...");
    const baseRaw = await loadMice();
    const deterministic = runDeterministicMatcher(baseRaw, profile, RERANK_CANDIDATE_LIMIT);
    const cleaned = deterministic.cleaned;

    if (!cleaned.length) {
      setStatus("No eligible mice found after data-quality filtering.");
      renderGrid($grid, [], profile.grip);
      return;
    }

    let budgetStatusNote = "";
    const budgetFiltered = deterministic.budgetFiltered;
    const scoped = deterministic.scoped;

    if (profile.budgetRange && budgetFiltered.mode === "no-price-data") {
      budgetStatusNote = `No price data available, so budget range $${Math.round(profile.budgetRange.min)}-$${Math.round(profile.budgetRange.max)} was ignored.`;
    } else if (profile.budgetRange && budgetFiltered.mode === "filtered" && !scoped.length) {
      const message = `No mice found in budget range $${Math.round(profile.budgetRange.min)}-$${Math.round(profile.budgetRange.max)}.`;
      setStatus(message);
      renderGrid($grid, [], profile.grip);
      return;
    }

    setStatus("Retrieving candidates...");
    const retrieval = deterministic.retrieval;
    if (!retrieval.list.length) {
      setStatus("No candidates were retrieved for your hand-size profile.");
      renderGrid($grid, [], profile.grip);
      return;
    }

    const candidatePool = deterministic.candidatePool;
    const mode = deterministic.mode;
    const relaxedLabels = deterministic.relaxedLabels;

    if (!candidatePool.length) {
      const selectedBits = profile.featureRequest.labels.length ? profile.featureRequest.labels.join(", ") : "current selections";
      setStatus(`No candidates found after fallback for ${selectedBits}.`);
      renderGrid($grid, [], profile.grip);
      return;
    }

    setStatus("Scoring locally...");
    const localRanked = deterministic.localRanked;
    let topMatches = localRanked.slice(0, TOP_MATCH_LIMIT);
    let rerankStatus = "Local ranking used.";

    if (localRanked.length > TOP_MATCH_LIMIT) {
      try {
        setStatus("Running chat rerank...");
        const reranked = await rerankWithChat(profile, localRanked.slice(0, RERANK_CANDIDATE_LIMIT));
        if (reranked?.length) {
          topMatches = reranked.slice(0, TOP_MATCH_LIMIT);
          rerankStatus = "Chat rerank applied.";
        } else {
          rerankStatus = "Chat rerank unavailable; local ranking used.";
        }
      } catch (error) {
        console.warn("Chat rerank failed, using local ranking", error);
        rerankStatus = "Chat rerank failed; local ranking used.";
      }
    }

    renderGrid($grid, topMatches, profile.grip);
    const modeStatus = `Candidate mode: ${describeMode(mode, relaxedLabels)}.`;
    setStatus([budgetStatusNote, modeStatus, rerankStatus].filter(Boolean).join(" "));
  } catch (error) {
    console.error(error);
    setStatus(String(error?.message || error || "Error"));
  }
}

generateReport();
