import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(path, replacements = (s) => s, resolver = require) {
  const source = replacements(
    readFileSync(new URL(path, import.meta.url), "utf8"),
  );
  const compiled = { exports: {} };
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  new Function("require", "module", "exports", outputText)(
    resolver,
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const presets = compile(
  "../src/features/mouse-fit-simulator/data/hand-presets.ts",
);
const store = compile(
  "../src/features/mouse-fit-simulator/store/MouseFitSimulatorStore.tsx",
  (s) =>
    s.replace(
      "function createInitialState",
      "export function createInitialState",
    ),
  (id) => (id.endsWith("hand-presets") ? presets : require(id)),
);

test("simulator uses saved measurements and grip unless a share link overrides them", () => {
  const oldWindow = globalThis.window,
    oldStorage = globalThis.sessionStorage;
  try {
    globalThis.window = { location: { search: "" } };
    globalThis.sessionStorage = {
      getItem: (key) =>
        ({
          "mf:length_mm": "180",
          "mf:width_mm": "92",
          "mf:grip": "fingertip",
        })[key] ?? null,
    };
    const saved = store.createInitialState();
    assert.equal(saved.hand.lengthCm, 18);
    assert.equal(saved.hand.widthCm, 9.2);
    assert.equal(saved.gripStyle, "fingertip");
    globalThis.window.location.search = "?hand=17&grip=claw&side=left";
    const shared = store.createInitialState();
    assert.equal(shared.hand.lengthCm, 17);
    assert.equal(shared.hand.widthCm, 8.5);
    assert.equal(shared.gripStyle, "claw");
    assert.equal(shared.hand.handedness, "left");
    globalThis.window.location.search = "?hand=17&width=9.2";
    assert.equal(store.createInitialState().hand.widthCm, 9.2);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldStorage;
  }
});

test("invalid share parameters cannot create non-finite anatomy", () => {
  const selection = store.parseSimulatorQuery(
    new URLSearchParams("hand=Infinity&grip=unknown&side=other"),
  );
  assert.equal(selection.handSizeCm, 17);
  assert.equal(selection.gripStyle, "palm");
  assert.equal(selection.handedness, "right");
});
