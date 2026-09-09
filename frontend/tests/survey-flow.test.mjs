import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/features/survey/SurveyPage.tsx", import.meta.url),
  "utf8",
);
const helpers = source.slice(
  source.indexOf("type Grip ="),
  source.indexOf("const subscribe ="),
);
const compiled = ts.transpileModule(
  helpers + "\nexport { loadInitial, validate, persist };",
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const module = { exports: {} };
new Function("module", "exports", compiled)(module, module.exports);
const { loadInitial, validate, persist } = module.exports;
function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
function withStorage(fn) {
  const old = globalThis.window;
  globalThis.window = { localStorage: storage(), sessionStorage: storage() };
  try {
    fn(globalThis.window);
  } finally {
    if (old === undefined) delete globalThis.window;
    else globalThis.window = old;
  }
}
test("fresh survey requires measurements instead of treating missing storage as a minimum-size hand", () =>
  withStorage(() => {
    const answers = loadInitial();
    assert.equal(answers.lengthMm, 0);
    assert.equal(answers.widthMm, 0);
    assert.equal(answers.primaryGrip, null);
  }));
test("returning from camera or reloading keeps the newest survey draft over older report measurements", () =>
  withStorage(({ localStorage, sessionStorage }) => {
    sessionStorage.setItem("mf:length_mm", "170");
    sessionStorage.setItem("mf:width_mm", "80");
    localStorage.setItem(
      "mousefit:survey_wizard_state",
      JSON.stringify({
        lengthMm: 186,
        widthMm: 94,
        primaryGrip: "claw",
        budgetMin: 40,
        budgetMax: 120,
      }),
    );
    const answers = loadInitial();
    assert.equal(answers.lengthMm, 186);
    assert.equal(answers.widthMm, 94);
    assert.equal(answers.primaryGrip, "claw");
    assert.equal(answers.budgetMax, 120);
  }));
test("validation rejects invalid hand proportions and missing grip details", () =>
  withStorage(() => {
    const answers = {
      ...loadInitial(),
      primaryGrip: "fingertip",
      fingerStackPosition: "middle",
      lengthMm: 180,
      widthMm: 90,
    };
    assert.equal(validate(answers), "");
    assert.match(
      validate({ ...answers, lengthMm: 110, widthMm: 120 }),
      /width must be less/i,
    );
    assert.match(
      validate({ ...answers, primaryGrip: "claw" }),
      /claw follow-up/i,
    );
  }));
test("finishing the survey keeps simulator grip and measurements in sync, including skipping an old grip", () =>
  withStorage(({ sessionStorage, localStorage }) => {
    const answers = {
      ...loadInitial(),
      primaryGrip: "fingertip",
      fingerStackPosition: "middle",
      lengthMm: 186,
      widthMm: 94,
    };
    persist(answers);
    assert.equal(sessionStorage.getItem("mf:grip"), "fingertip");
    assert.equal(sessionStorage.getItem("mf:length_mm"), "186");
    persist({ ...answers, primaryGrip: null, gripSkipped: true });
    assert.equal(sessionStorage.getItem("mf:grip"), null);
    assert.equal(localStorage.getItem("mousefit:grip_result"), null);
  }));
