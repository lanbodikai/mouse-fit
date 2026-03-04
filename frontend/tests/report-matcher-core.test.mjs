import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  RERANK_CANDIDATE_LIMIT,
  buildUserProfileFromInputs,
  filterMiceByBudget,
  runDeterministicMatcher,
} from "../public/src/js/report-matcher-core.js";

const DATA_PATH = path.resolve(process.cwd(), "..", "backend", "data", "mice.json");
const RAW_MICE = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

function makeClawProfile() {
  return buildUserProfileFromInputs({
    measurement: { length_mm: 180, width_mm: 90 },
    gripFromStorage: "claw",
    selections: {
      primaryGrip: "claw",
      shellShape: "sym",
      humpPosition: "back",
      sideShape: "inward",
      fingerDirection: "right",
      thumbPosition: "inward",
      dominantFinger: "ring",
      palmFingerCurved: "",
      clawRelaxed: "yes",
      clawBackHandTouch: "yes",
    },
    budgetRange: { min: 80, max: 160 },
  });
}

function makeFingertipProfile() {
  return buildUserProfileFromInputs({
    measurement: { length_mm: 165, width_mm: 82 },
    gripFromStorage: "fingertip",
    selections: {
      primaryGrip: "fingertip",
      shellShape: "sym",
      humpPosition: "center",
      sideShape: "inward",
      fingerDirection: "center",
      thumbPosition: "relaxed",
      dominantFinger: "index",
      palmFingerCurved: "",
      clawRelaxed: "",
      clawBackHandTouch: "",
    },
    budgetRange: { min: 0, max: 80 },
  });
}

function makePalmProfile() {
  return buildUserProfileFromInputs({
    measurement: { length_mm: 198, width_mm: 100 },
    gripFromStorage: "palm",
    selections: {
      primaryGrip: "palm",
      shellShape: "ergo",
      humpPosition: "center",
      sideShape: "flat",
      fingerDirection: "left",
      thumbPosition: "inward",
      dominantFinger: "ring",
      palmFingerCurved: "no",
      clawRelaxed: "",
      clawBackHandTouch: "",
    },
    budgetRange: null,
  });
}

test("golden ranking stays stable for claw and fingertip profiles", () => {
  const claw = runDeterministicMatcher(RAW_MICE, makeClawProfile(), RERANK_CANDIDATE_LIMIT);
  const clawTopIds = claw.localRanked.slice(0, 4).map((item) => item.id);
  assert.deepEqual(clawTopIds, [
    "benq-zowie-za12",
    "benq-zowie-za13",
    "benq-zowie-za13-dw",
    "benq-zowie-za11",
  ]);

  const fingertip = runDeterministicMatcher(RAW_MICE, makeFingertipProfile(), RERANK_CANDIDATE_LIMIT);
  const fingertipTopIds = fingertip.localRanked.slice(0, 4).map((item) => item.id);
  assert.deepEqual(fingertipTopIds, [
    "asus-rog-rog-keris-ii-ace",
    "asus-rog-rog-keris-ii-origin",
    "asus-rog-rog-keris-wireless-aimpoint",
    "vaxee-zygen-np-01",
  ]);

  const isDescending = claw.localRanked.every((item, idx, arr) => idx === 0 || item.score <= arr[idx - 1].score);
  assert.equal(isDescending, true);
});

test("hard-filter floor invariants are preserved in retrieval output", () => {
  const profile = makeClawProfile();
  const out = runDeterministicMatcher(RAW_MICE, profile, RERANK_CANDIDATE_LIMIT);

  assert.ok(out.retrieval.list.length > 0);
  const allRespectFloors = out.retrieval.list.every(
    (item) => item.length >= profile.hardMinLength && item.gripWidthEstimate >= profile.hardMinWidth,
  );
  assert.equal(allRespectFloors, true);
});

test("strict feature filtering falls back when strict set is empty", () => {
  const out = runDeterministicMatcher(RAW_MICE, makeClawProfile(), RERANK_CANDIDATE_LIMIT);

  assert.equal(out.strict.list.length, 0);
  assert.ok(String(out.mode).startsWith("fallback-"));
  assert.ok(out.candidatePool.length > 0);
});

test("budget handling modes remain deterministic", () => {
  const withBudget = runDeterministicMatcher(RAW_MICE, makeFingertipProfile(), RERANK_CANDIDATE_LIMIT);
  assert.equal(withBudget.budgetFiltered.mode, "no-price-data");
  assert.equal(withBudget.scoped.length, withBudget.cleaned.length);

  const noBudget = runDeterministicMatcher(RAW_MICE, makePalmProfile(), RERANK_CANDIDATE_LIMIT);
  assert.equal(noBudget.budgetFiltered.mode, "no-budget");
  assert.equal(noBudget.scoped.length, noBudget.cleaned.length);
});

test("budget filter keeps a small tolerance around user range", () => {
  const sample = [
    { id: "inside", price: 85 },
    { id: "slightly-low", price: 74 },
    { id: "slightly-high", price: 126 },
    { id: "too-low", price: 60 },
    { id: "too-high", price: 141 },
  ];
  const out = filterMiceByBudget(sample, { min: 80, max: 120 });
  const ids = out.list.map((item) => item.id);
  assert.equal(out.mode, "filtered");
  assert.deepEqual(ids, ["inside", "slightly-low", "slightly-high"]);
});
