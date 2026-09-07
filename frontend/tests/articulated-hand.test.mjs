import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { Mesh, MeshStandardMaterial, Box3, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const require = createRequire(import.meta.url);
function loadTs(path, transform = (s) => s) {
  const source = transform(readFileSync(new URL(path, import.meta.url), "utf8"));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", outputText)(require, compiled, compiled.exports);
  return compiled.exports;
}
const { createHandPose } = loadTs("../src/features/mouse-fit-simulator/scene/articulated-hand.ts");
const { deriveHandMeasurements } = loadTs("../src/features/mouse-fit-simulator/data/hand-presets.ts");
const { createHandSurface } = loadTs("../src/features/mouse-fit-simulator/scene/hand-surface.ts");
const { orientStlGeometry, fitModel } = loadTs("../src/features/mouse-fit-simulator/scene/ImportedMouseModel.tsx", (s) =>
  'import { Box3, BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";\n'
  + s.slice(s.indexOf("const CENTIMETERS"), s.indexOf("function loadStlGeometry"))
  + s.slice(s.indexOf("function fitModel"), s.indexOf("type MouseProps"))
  + '\nexport { orientStlGeometry, fitModel };');
const manifest = JSON.parse(readFileSync(new URL("../public/models/mice/manifest.json", import.meta.url), "utf8"));

const ids = process.env.HAND_FULL_CATALOG
  ? [...new Map(manifest.models.map((m) => [m.assetUrl, m.id])).values()]
  : ["benq-zowie-ec2-c", "asus-rog-harpe-ace-extreme", "cooler-master-mm710"];
for (const id of ids) {
  const mouse = manifest.models.find((m) => m.id === id);
  const bytes = readFileSync(new URL("../public" + decodeURIComponent(mouse.assetUrl), import.meta.url));
  const geometry = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const surface = fitModel(new Mesh(orientStlGeometry(geometry, mouse), new MeshStandardMaterial()), mouse);
  if (id === "benq-zowie-ec2-c") test("replacement skin is finite and closed at finger joints", () => {
    const pose = createHandPose(surface, { ...deriveHandMeasurements(17), handedness: "right" }, "claw");
    const skin = createHandSurface(pose);
    const vertices = skin.getAttribute("position");
    const normals = skin.getAttribute("normal");
    assert.ok(vertices.count > 3000);
    const edges = new Map();
    for (let i = 0; i < vertices.count; i += 3) {
      const keys = [0, 1, 2].map((j) => {
        const p = new Vector3().fromBufferAttribute(vertices, i + j);
        assert.ok(p.toArray().every(Number.isFinite));
        assert.ok(new Vector3().fromBufferAttribute(normals, i + j).length() > 0.9);
        return p.toArray().map((v) => v.toFixed(4)).join(",");
      });
      if (new Set(keys).size < 3) continue;
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const key = [keys[a], keys[b]].sort().join("|");
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.equal([...edges.values()].filter((count) => count === 1).length, 0, "skin has an open seam");
    skin.dispose();
  });
  for (const length of [15, 17, 21]) for (const handedness of ["right", "left"]) for (const grip of ["palm", "claw", "fingertip"]) {
    test(`${id} / ${length} cm / ${handedness} / ${grip}: fixed anatomy and five surface contacts`, () => {
      const hand = { ...deriveHandMeasurements(length), handedness };
      const pose = createHandPose(surface, hand, grip);
      const middle = pose.digits.find((d) => d.name === "middle");
      const measured = pose.wrist.distanceTo(middle.joints[0]) + middle.lengths.reduce((a, b) => a + b, 0) + middle.radius;
      assert.ok(Math.abs(measured - length) < 0.001, `hand length ${measured}, wanted ${length}`);
      assert.equal(pose.digits.length, 5);
      for (const digit of pose.digits) {
        digit.lengths.forEach((expected, i) => {
          assert.ok(Math.abs(digit.joints[i].distanceTo(digit.joints[i + 1]) - expected) < 1e-5, `${digit.name} bone ${i} stretched`);
        });
        const tip = digit.joints.at(-1);
        assert.ok(Math.abs(tip.distanceTo(digit.contact) - digit.radius) < 1e-6, `${digit.name} must touch shell`);
        digit.joints.forEach((p) => assert.ok(p.toArray().every(Number.isFinite)));
      }
      const dimensions = new Box3().setFromObject(surface).getSize(new Vector3());
      assert.ok(Math.abs(dimensions.z - mouse.dimensionsMm.lengthMm / 10) < 0.001);
    });
  }
}
