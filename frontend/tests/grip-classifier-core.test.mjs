import test from "node:test";
import assert from "node:assert/strict";

import {
  GRIP_CAPTURE_VIEWS,
  classifyGripFromSingleLandmarks,
  classifyGripFromViewLandmarks,
} from "../public/src/js/grip-classifier-core.js";

function makeLandmarks(indexTip, middleTip) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  landmarks[5] = { x: 0.2, y: 0.45 };
  landmarks[6] = { x: 0.4, y: 0.45 };
  landmarks[8] = indexTip;
  landmarks[9] = { x: 0.2, y: 0.68 };
  landmarks[10] = { x: 0.4, y: 0.68 };
  landmarks[12] = middleTip;
  return landmarks;
}

const STRAIGHT_HAND = makeLandmarks({ x: 0.62, y: 0.45 }, { x: 0.62, y: 0.68 });
const BENT_HAND = makeLandmarks({ x: 0.47, y: 0.28 }, { x: 0.46, y: 0.51 });
const SLIGHTLY_BENT_HAND = makeLandmarks({ x: 0.52, y: 0.38 }, { x: 0.52, y: 0.61 });

test("capture view order is top, bottom, side", () => {
  assert.deepEqual(GRIP_CAPTURE_VIEWS, ["Top", "Bottom", "Side"]);
});

test("straight index and middle fingers classify as palm", () => {
  const result = classifyGripFromViewLandmarks({
    top: STRAIGHT_HAND,
    bottom: STRAIGHT_HAND,
    side: STRAIGHT_HAND,
  });

  assert.ok(result);
  assert.equal(result.grip, "palm");
  assert.ok(result.score >= 0.7);
});

test("strongly bent index and middle fingers classify as claw", () => {
  const result = classifyGripFromViewLandmarks({
    top: BENT_HAND,
    bottom: BENT_HAND,
    side: BENT_HAND,
  });

  assert.ok(result);
  assert.equal(result.grip, "claw");
  assert.ok(result.score >= 0.7);
});

test("a very bent side profile still classifies as claw", () => {
  const result = classifyGripFromViewLandmarks({
    top: STRAIGHT_HAND,
    bottom: STRAIGHT_HAND,
    side: BENT_HAND,
  });

  assert.ok(result);
  assert.equal(result.grip, "claw");
});

test("a not-really-bent side profile stays palm", () => {
  const result = classifyGripFromViewLandmarks({
    top: STRAIGHT_HAND,
    bottom: STRAIGHT_HAND,
    side: SLIGHTLY_BENT_HAND,
  });

  assert.ok(result);
  assert.equal(result.grip, "palm");
});

test("single-view fallback still treats a very bent side profile as claw", () => {
  const result = classifyGripFromSingleLandmarks(BENT_HAND, "side");

  assert.ok(result);
  assert.equal(result.grip, "claw");
});
