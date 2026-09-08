"""The original MouseFit report matcher, ported without changing its scoring rules.

This deliberately mirrors ``public/src/js/report-matcher-core.js`` so the API and
the current React report use the same legacy fit model.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Any

from backend.schemas.api import Mouse, MeasurementOut, ReportPreferences

TOP_MATCH_LIMIT = 3
MIN_RETRIEVAL_POOL = 40
BUCKET_TOLERANCE = {"small": 9, "medium": 10, "big": 11}
FEATURE_WEIGHTS = {"hump": 2, "side": 2, "shell": 1}
IDEAL_RATIO = {"palm": .7, "claw": .62, "fingertip": .55}
IDEAL_WIDTH_RATIO = {"palm": .7, "claw": .68, "fingertip": .64}
WEIGHT_BASE = {"palm": 65, "claw": 65, "fingertip": 45}

REFERENCE_PROFILES = {
    "claw:regular-claw": (122, 62, 38.5, 63, ["sym"], ["back_high", "back"], ["inward"], ["xm2w", "xm2 8k", "xm2we"]),
    "claw:relaxed-claw": (119, 60, 38, 45, ["sym"], ["center", "back_high", "back"], ["inward", "flat"], ["maya 8k", "maya"]),
    "claw:fingertip-claw": (118.2, 58.5, 37.2, 50.5, ["sym"], ["back", "center"], ["flat", "inward"], ["op1"]),
    "palm:palm-claw": (125, 61.5, 40, 60, ["sym"], ["center", "back"], ["flat", "inward"], ["g pro x superlight 2", "superlight 2"]),
    "palm:full-palm": (127, 63.5, 42.8, 59, ["ergo", "sym"], ["center", "back"], ["inward", "flat"], ["superlight 2 dex", "deathadder", "viper v3 pro"]),
    "fingertip:default": (118.2, 58.5, 37.2, 50.5, ["sym"], ["back", "center"], ["flat", "inward"], ["op1"]),
}


def clamp(value: float, lo: float, hi: float) -> float:
    return min(max(value, lo), hi)


def shape_key(value: str | None) -> str:
    value = (value or "").strip().lower()
    if "ergo" in value: return "ergo"
    if "sym" in value or "ambi" in value: return "sym"
    if "hybrid" in value: return "hybrid"
    return "other"


def hump_key(value: str | None) -> str:
    value = (value or "").strip().lower()
    back = "back" in value or "rear" in value
    if back and any(x in value for x in ("aggressive", "high", "tall", "huge", "pronounced")): return "back_high"
    if back: return "back"
    if any(x in value for x in ("center", "middle", "mid")): return "center"
    return "other"


def side_key(value: str | None) -> str:
    value = (value or "").strip().lower()
    if any(x in value for x in ("inward", "concave", "curve", "slant")): return "inward"
    if "flat" in value or "straight" in value: return "flat"
    if "outward" in value or "convex" in value: return "outward"
    return "other"


def hump_matches(actual: str, requested: str | None) -> bool:
    return not requested or (actual in ("back", "back_high") if requested == "back" else actual == requested)


@dataclass
class Candidate:
    mouse: Mouse
    length: float
    width: float
    height: float
    weight: float
    price: float | None
    shape: str
    hump: str
    side: str
    grip_width: float
    name_key: str


def normalize_mouse(mouse: Mouse) -> Candidate:
    length, width, height = mouse.length_mm or 0, mouse.width_mm or 0, mouse.height_mm or 0
    side = side_key(mouse.side_curvature_raw or mouse.side_profile)
    return Candidate(mouse, length, width, height, mouse.weight_g or 0, mouse.price_usd,
                     shape_key(mouse.shape), hump_key(mouse.hump), side,
                     clamp(width - {"inward": 4, "flat": 2, "outward": 1}.get(side, 2.5), 0, 100),
                     f"{mouse.brand} {mouse.model} {mouse.brand} {mouse.model}".lower())


def feature_request(p: ReportPreferences) -> dict[str, Any]:
    requested: dict[str, str] = {}
    if p.shellShape in ("ergo", "sym"): requested["shell"] = p.shellShape
    if p.humpPosition in ("back", "center"): requested["hump"] = p.humpPosition
    if p.sideShape in ("inward", "flat"): requested["side"] = p.sideShape
    return {"requested": requested, "count": len(requested)}


def build_profile(measurement: MeasurementOut, grip: str, p: ReportPreferences) -> dict[str, Any]:
    hand_length, hand_width = measurement.length_mm, measurement.width_mm
    grip = grip if grip in IDEAL_RATIO else "palm"
    bucket = "small" if hand_length / 10 < 17 else "medium" if hand_length / 10 < 19 else "big"
    slanted = p.fingerDirection in ("left", "right")
    inward = p.thumbPosition == "inward"
    palm_subtype = "palm-claw" if grip == "palm" and p.palmFingerCurved == "yes" else "full-palm"
    claw_subtype = ("fingertip-claw" if p.clawBackHandTouch == "no" else "relaxed-claw" if p.clawRelaxed == "yes" else "regular-claw") if grip == "claw" else ""
    length_delta = (2 if slanted else 0) + (-2 if inward else 0)
    width_delta = (1 if slanted else 0) + (-1.5 if inward else 0)
    if grip == "claw":
        add = {"regular-claw": (7, 1), "relaxed-claw": (5, .6), "fingertip-claw": (2, 0)}[claw_subtype]
        length_delta += add[0]; width_delta += add[1]
    elif grip == "palm":
        add = (2.5, .7) if palm_subtype == "palm-claw" else (1, .4)
        length_delta += add[0]; width_delta += add[1]
    if p.dominantFinger == "ring" and slanted:
        length_delta += .8; width_delta += .4
    length_scale, width_scale = (hand_length - 180) * .55, (hand_width - 85) * .65
    target_l, target_w = hand_length * IDEAL_RATIO[grip] + length_delta, hand_width * IDEAL_WIDTH_RATIO[grip] + width_delta
    min_l, min_w, max_w = target_l - 9, target_w - 4.5, target_w + 6
    if grip == "claw":
        if claw_subtype == "regular-claw": target_l,target_w,min_l,min_w,max_w = 120+length_scale,(62 if slanted else 60)+width_scale,117+length_scale*.65,(60.5 if slanted else 59)+width_scale*.8,(65.5 if slanted else 63.5)+width_scale
        elif claw_subtype == "relaxed-claw": target_l,target_w,min_l,min_w,max_w = 119+length_scale*.9,(61 if slanted else 60)+width_scale*.95,115+length_scale*.65,(59 if slanted else 58.5)+width_scale*.75,(64.5 if slanted else 63.2)+width_scale
        else: target_l,target_w,min_l,min_w,max_w = 117+length_scale*.8,(58 if inward else 59.5)+width_scale*.9,113+length_scale*.6,(56.5 if inward else 58)+width_scale*.7,(61.5 if inward else 62.5)+width_scale*.9
    elif grip == "palm":
        if palm_subtype == "palm-claw": target_l,target_w,min_l,min_w,max_w = 125+length_scale*.8,(64 if slanted else 63)+width_scale,122+length_scale*.6,(62 if slanted else 61)+width_scale*.85,(67.5 if slanted else 66)+width_scale
        else: target_l,target_w,min_l,min_w,max_w = 126+length_scale*.85,(64 if slanted else 63)+width_scale,125+length_scale*.65,61+width_scale*.8,(68 if slanted else 66.5)+width_scale
    else: target_l,target_w,min_l,min_w,max_w = 115+length_scale*.75,(58 if inward else 59.5)+width_scale*.85,109+length_scale*.55,(56.5 if inward else 58)+width_scale*.7,(61 if inward else 62.5)+width_scale*.9
    if slanted and inward: target_w,min_w,max_w = target_w-1.4,min_w-1.6,max_w-.4
    return dict(grip=grip, hand_bucket=bucket, palm_subtype=palm_subtype, claw_subtype=claw_subtype, is_slanted=slanted, inward_thumb=inward, finger_direction=p.fingerDirection or "", target_length=target_l, target_width=target_w, min_length=min_l, min_width=min_w, max_width=max_w, hard_min_length=min_l if grip == "palm" else min_l-1.2, hard_min_width=min_w-.8, feature=feature_request(p), reference=p.dominantFinger == "ring" and 175 <= hand_length <= 185 and 76 <= hand_width <= 84)


def feature_distance(c: Candidate, f: dict[str, Any]) -> tuple[float, int]:
    r = f["requested"]; distance = count = 0
    if r.get("shell") and c.shape != r["shell"]: distance += 1; count += 1
    if r.get("hump") and not hump_matches(c.hump, r["hump"]): distance += 2; count += 1
    if r.get("side") and c.side != r["side"]: distance += 2; count += 1
    return distance, count


def retrieve(candidates: list[Candidate], p: dict[str, Any]) -> tuple[list[Candidate], float]:
    length_tol = BUCKET_TOLERANCE[p["hand_bucket"]]; width_tol = {"small":3.8,"medium":4.2,"big":4.6}[p["hand_bucket"]]
    def allowed(c: Candidate, lt: float, wt: float) -> bool:
        return c.length >= p["hard_min_length"] and c.grip_width >= p["hard_min_width"] and abs(c.length-p["target_length"]) <= lt and abs(c.grip_width-p["target_width"]) <= wt and c.length >= p["min_length"]-1.5 and c.grip_width >= p["min_width"]-1.3 and c.grip_width <= p["max_width"]+2.2
    pool = [c for c in candidates if allowed(c, length_tol, width_tol)]
    if len(pool) < MIN_RETRIEVAL_POOL:
        length_tol += 4; width_tol += 1.6; pool = [c for c in candidates if allowed(c, length_tol, width_tol)]
    if not pool:
        source = [c for c in candidates if c.length >= p["hard_min_length"] and c.grip_width >= p["hard_min_width"]] or candidates
        pool = sorted(source, key=lambda c: abs(c.length-p["target_length"])*1.1 + abs(c.grip_width-p["target_width"])*1.25)[:120]
    return pool, length_tol


def tolerance(diff: float, good: float, hard: float) -> float:
    if diff <= good: return 100
    if diff >= hard: return 0
    ratio = (diff-good)/(hard-good); return 100*(1-ratio*ratio)


def band(value: float, ilo: float, ihi: float, slo: float, shi: float, hlo: float, hhi: float) -> float:
    if not isfinite(value) or value <= 0: return 60
    if ilo <= value <= ihi: return 100
    if value < ilo: return 80+(value-slo)/(ilo-slo)*20 if value >= slo else (value-hlo)/(slo-hlo)*80 if value >= hlo else 0
    return 80+(shi-value)/(shi-ihi)*20 if value <= shi else (hhi-value)/(hhi-shi)*80 if value <= hhi else 0


def score(c: Candidate, p: dict[str, Any], used_tol: float) -> float:
    grip = p["grip"]; fd, fm = feature_distance(c, p["feature"])
    length = tolerance(abs(c.length-p["target_length"]), {"small":3.5,"medium":4,"big":4.5}[p["hand_bucket"]], used_tol+8)
    width = tolerance(abs(c.grip_width-p["target_width"]), {"claw":1.6,"palm":1.8,"fingertip":1.5}[grip], 8.5)
    height = band(c.height, *( (39,44,37,46,34,50) if grip == "palm" else (38.5,41,37,42,34,44.5) if grip == "claw" else (33,38,32,39.5,29,41.5) ))
    if not c.weight: weight = 62
    elif c.weight <= WEIGHT_BASE[grip]: weight = clamp(100-(WEIGHT_BASE[grip]-c.weight)*.3,84,100)
    else:
        penalty=(c.weight-WEIGHT_BASE[grip])*({"fingertip":1.9,"claw":1.15,"palm":.95}[grip])
        if c.weight > 81: penalty += (c.weight-81)*({"fingertip":2.4,"claw":1.6,"palm":1.3}[grip])
        weight=clamp(100-penalty,0,100)
    shape = 72
    if grip == "palm": shape += 9 if p["palm_subtype"] == "palm-claw" and c.shape == "sym" else 7 if p["palm_subtype"] == "palm-claw" and c.shape == "ergo" else 11 if p["palm_subtype"] != "palm-claw" and c.shape == "ergo" else 5 if p["palm_subtype"] != "palm-claw" and c.shape == "sym" else 0
    elif grip == "claw":
        shape += (11 if c.shape == "sym" else 4 if c.shape == "hybrid" else -2 if c.shape == "ergo" else 0) if p["claw_subtype"] == "regular-claw" else (9 if c.shape == "sym" else 6 if c.shape == "hybrid" else 2 if c.shape == "ergo" else 0) if p["claw_subtype"] == "relaxed-claw" else (10 if c.shape == "sym" else 3 if c.shape == "hybrid" else -4 if c.shape == "ergo" else 0)
    else: shape += 10 if c.shape == "sym" else 4 if c.shape == "hybrid" else -18 if c.shape == "ergo" else 0
    if p["inward_thumb"]: shape += 12 if c.side == "inward" else -5 if c.side == "flat" else -12 if c.side == "outward" else 0
    elif p["is_slanted"]: shape += 7 if c.side == "inward" else 2 if c.side == "flat" else 0
    elif grip == "palm" and c.side == "flat": shape += 4
    shape = clamp(shape-fd*11+(4 if fm == 0 and p["feature"]["count"] else 0),0,100)
    hump = 68
    if grip == "claw":
        if p["claw_subtype"] == "regular-claw": hump = 100 if c.hump == "back_high" else 92 if c.hump == "back" else 60 if c.hump == "center" else 48; hump += 5 if c.hump == "back" and c.height >= 38 else -14 if c.height < 36.5 else 0
        elif p["claw_subtype"] == "relaxed-claw": hump = (98 if c.hump == "center" else 94 if c.hump == "back_high" else 84 if c.hump == "back" else 52) - (8 if c.height > 43 else 0)
        else: hump = (84 if c.hump == "center" else 76 if c.hump == "back" else 48 if c.hump == "back_high" else 56) - (14 if c.height >= 40 else 0)
    elif grip == "palm": hump = 92 if c.hump == "center" else 84 if c.hump == "back" else 72 if c.hump == "back_high" else 60
    else: hump = 44 if c.hump == "back_high" else 86 if c.hump == "center" else 78 if c.hump == "back" else 64
    if p["feature"]["requested"].get("hump"): hump += 6 if hump_matches(c.hump,p["feature"]["requested"]["hump"]) else -18
    hump = clamp(hump-fd*6,0,100)
    posture=0
    if p["is_slanted"]: posture += (4 if p["target_length"] <= c.length <= p["target_length"]+8 else -3 if c.length < p["target_length"]-4 else 0) + (2 if c.grip_width >= p["target_width"] else 0)
    if p["inward_thumb"]: posture += (3 if c.length <= p["target_length"]+1 else -2)+(3 if c.grip_width <= p["target_width"]+1.2 else -2)+(2 if c.side == "inward" else 0)
    if grip == "claw" and p["claw_subtype"] == "regular-claw": posture += 4 if c.hump == "back_high" else 2 if c.hump == "back" else -2
    if p["finger_direction"] in ("left","right") and c.side == "inward": posture += 1
    reference = 65
    if p["reference"]:
        key = f"{grip}:{p['claw_subtype'] if grip == 'claw' else p['palm_subtype'] if grip == 'palm' else 'default'}"
        ref_l, ref_w, ref_h, ref_weight, ref_shapes, ref_humps, ref_sides, ref_tokens = REFERENCE_PROFILES[key]
        reference = .38*tolerance(abs(c.length-ref_l),2.8,13)+.24*tolerance(abs(c.grip_width-ref_w),2.2,8.5)+.2*tolerance(abs(c.height-ref_h),1.4,8)+.18*tolerance(abs((c.weight or ref_weight)-ref_weight),4,22)
        reference += 7 if c.shape in ref_shapes else -8
        reference += 8 if any(hump_matches(c.hump, h) for h in ref_humps) else -8
        reference += 6 if c.side in ref_sides else -5
        reference += 7 if any(token in c.name_key for token in ref_tokens) else 0
        reference = clamp(reference,0,100)
    total=.3*length+.16*width+.2*height+.14*weight+.1*shape+.1*hump+clamp(posture,-12,12)-fd*2.2
    if c.length < p["min_length"]: total -= (p["min_length"]-c.length)*5.2
    if c.grip_width < p["min_width"]: total -= (p["min_width"]-c.grip_width)*6.8
    if c.grip_width > p["max_width"]+.6: total -= (c.grip_width-p["max_width"])*2.7
    if p["reference"]: total += .08*(reference-65)
    return clamp(total,0,100)


def match(mice: list[Mouse], measurement: MeasurementOut, preferences: ReportPreferences, fallback_grip: str | None) -> list[tuple[Candidate, float]]:
    grip = preferences.primaryGrip or fallback_grip or "palm"
    profile = build_profile(measurement, grip.lower(), preferences)
    candidates = [normalize_mouse(m) for m in mice]
    candidates = [c for c in candidates if c.length > 0 and c.width > 0 and c.height > 0 and 70 <= c.length <= 140 and c.width <= 90 and c.height <= 60 and c.shape != "other"]
    if preferences.budgetMin is not None and preferences.budgetMax is not None:
        priced=[c for c in candidates if c.price and c.price > 0]
        if priced:
            lo,hi=sorted((preferences.budgetMin,preferences.budgetMax)); tol=max(8,(hi-lo if hi-lo >= 20 else 20)*.12)
            candidates=[c for c in priced if lo-tol <= c.price <= hi+tol]
    pool, used_tol = retrieve(candidates,profile)
    strict=[c for c in pool if feature_distance(c,profile["feature"])[1] == 0]
    if strict: pool=strict
    else:
        annotated=sorted(pool,key=lambda c:(feature_distance(c,profile["feature"])[1],feature_distance(c,profile["feature"])[0]))
        pool=[c for c in annotated if feature_distance(c,profile["feature"])[1] <= 1] or [c for c in annotated if feature_distance(c,profile["feature"])[1] <= 2] or annotated
    return sorted(((c,score(c,profile,used_tol)) for c in pool),key=lambda item:item[1],reverse=True)[:TOP_MATCH_LIMIT]
