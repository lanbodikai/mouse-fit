import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL(
    "../src/features/mouse-fit-simulator/data/mouse-model-manifest.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = { exports: {} };
let catalog = [];
let catalogError = null;
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(
  () => ({
    getMice: async () => {
      if (catalogError) throw catalogError;
      return catalog;
    },
  }),
  compiled,
  compiled.exports,
);
const { reconcileMouseModels, loadMouseModelManifest } = compiled.exports;
const manifest = JSON.parse(
  readFileSync(
    new URL("../public/models/mice/manifest.json", import.meta.url),
    "utf8",
  ),
);
const model = manifest.models[0];
const row = {
  id: "catalog-id",
  brand: model.brand,
  model: model.name,
  length_mm: 127,
  width_mm: 64,
  height_mm: 39,
};

test("removed catalog products cannot be selected from old assets", () => {
  assert.deepEqual(reconcileMouseModels(manifest.models, []), []);
  const selected = reconcileMouseModels(manifest.models, [row]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, row.id);
  assert.deepEqual(selected[0].dimensionsMm, {
    lengthMm: 127,
    widthMm: 64,
    heightMm: 39,
  });
});

test("duplicate catalog identities produce one selectable model", () => {
  assert.equal(
    reconcileMouseModels(manifest.models, [row, { ...row, id: "duplicate" }])
      .length,
    1,
  );
});

test("similar names and invalid dimensions cannot select an unrelated shape", () => {
  assert.deepEqual(
    reconcileMouseModels(manifest.models, [
      { ...row, model: `${row.model} Different Edition` },
    ]),
    [],
  );
  for (const length_mm of [0, NaN, Infinity, 251, null]) {
    assert.deepEqual(
      reconcileMouseModels(manifest.models, [{ ...row, length_mm }]),
      [],
    );
  }
});

test("catalog failure fails closed instead of falling back to removed models", async (context) => {
  context.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => manifest,
  }));
  catalogError = new Error("Catalog unavailable");
  await assert.rejects(loadMouseModelManifest(), /Catalog unavailable/);
  catalogError = null;
  catalog = [row];
  const loaded = await loadMouseModelManifest();
  assert.deepEqual(
    loaded.models.map((model) => model.id),
    [row.id],
  );
});
