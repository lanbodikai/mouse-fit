import test from "node:test";
import assert from "node:assert/strict";

import { API_BASE } from "../public/src/js/api-client.js";

test("api client has a non-empty default base url", () => {
  assert.equal(typeof API_BASE, "string");
  assert.ok(API_BASE.length > 0);
  assert.ok(API_BASE.startsWith("http"));
});
