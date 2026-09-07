import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const require = createRequire(import.meta.url);
const occtFactory = require("occt-import-js");
const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(projectRoot, "public", "models", "presets");
const gateronDirectory = resolve(projectRoot, "public", "models", "gateron");
const cherryKeycapSource = resolve(
  projectRoot,
  "public",
  "models",
  "keycaps",
  "cherry-keycaps-full.fbx",
);
const wootingUrl =
  "https://raw.githubusercontent.com/WootingKb/wooting-design/main/wooting-60he-v2/wooting_60he-v2_ansi_asm_260118.stp";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

function createGeometry(mesh) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(mesh.attributes.position.array), 3));
  if (mesh.attributes.normal) {
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(mesh.attributes.normal.array), 3));
  } else {
    geometry.computeVertexNormals();
  }
  geometry.setIndex(mesh.index.array);
  return geometry;
}

function createMaterial(mesh) {
  const color = mesh.color ? new Color(mesh.color[0], mesh.color[1], mesh.color[2]) : new Color("#54606a");
  return new MeshStandardMaterial({ color, metalness: 0.36, roughness: 0.42 });
}

function buildSingleMeshScene(model) {
  const scene = new Scene();
  const mesh = model.meshes[0];
  scene.add(new Mesh(createGeometry(mesh), createMaterial(mesh)));
  return scene;
}

function appendNode(node, parent, meshes) {
  const group = new Group();
  group.name = node.name;
  parent.add(group);
  for (const meshIndex of node.meshes) {
    const mesh = new Mesh(createGeometry(meshes[meshIndex]), createMaterial(meshes[meshIndex]));
    mesh.name = `${node.name || "mesh"}-${meshIndex}`;
    group.add(mesh);
  }
  for (const child of node.children) appendNode(child, group, meshes);
}

function buildWootingScene(model) {
  const scene = new Scene();
  appendNode(model.root, scene, model.meshes);
  return scene;
}

async function exportGlb(scene, outputPath) {
  const output = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(output));
}

async function importStep(content, importer) {
  const model = importer.ReadStepFile(content, {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.003,
    angularDeflection: 0.55,
  });
  if (!model.success || model.meshes.length === 0) throw new Error("STEP import failed.");
  return model;
}

async function exportCherryKeycapProfiles() {
  const sourceFile = await readFile(cherryKeycapSource);
  const sourceBuffer = sourceFile.buffer.slice(
    sourceFile.byteOffset,
    sourceFile.byteOffset + sourceFile.byteLength,
  );
  const source = new FBXLoader().parse(sourceBuffer, "");
  const wantedProfiles = new Set([
    "R1_1u",
    "R1_2u",
    "R2_1u",
    "R2_15u",
    "R3_1u",
    "R3_175u",
    "R3_225u",
    "R4_1u",
    "R4_225u",
    "R4_275u",
    "R5_125u",
    "Convex_625u",
  ]);
  const scene = new Scene();
  source.traverse((child) => {
    if (!(child instanceof Mesh) || !wantedProfiles.has(child.name)) return;
    const mesh = new Mesh(
      child.geometry.clone(),
      new MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.26, metalness: 0.02 }),
    );
    mesh.name = child.name;
    scene.add(mesh);
  });

  if (scene.children.length !== wantedProfiles.size) {
    throw new Error("The Cherry MX source did not contain every required profile.");
  }

  await exportGlb(scene, resolve(outputDirectory, "cherry-mx-keycap-profiles.glb"));
}

async function main() {
  if (process.argv.includes("--keycaps-only")) {
    await exportCherryKeycapProfiles();
    return;
  }

  const importer = await occtFactory();
  const gateronModels = [
    ["gateron-low-profile-magnetic-jade-mini.stp", "gateron-low-profile-magnetic-jade-mini.glb"],
    ["gateron-low-profile-magnetic-jade-pro-mini.stp", "gateron-low-profile-magnetic-jade-pro-mini.glb"],
    ["gateron-ks20-magnetic-hall-sensor.stp", "gateron-ks20-magnetic-hall-sensor.glb"],
    ["gateron-magnetic-jade-ks20.stp", "gateron-magnetic-jade-ks20.glb"],
  ];

  for (const [sourceName, outputName] of gateronModels) {
    const model = await importStep(await readFile(resolve(gateronDirectory, sourceName)), importer);
    await exportGlb(buildSingleMeshScene(model), resolve(outputDirectory, outputName));
  }

  const response = await fetch(wootingUrl);
  if (!response.ok) throw new Error(`Unable to fetch Wooting reference STEP (${response.status}).`);
  const wooting = await importStep(new Uint8Array(await response.arrayBuffer()), importer);
  await exportGlb(buildWootingScene(wooting), resolve(outputDirectory, "wooting-60he-v2-reference.glb"));
  await exportCherryKeycapProfiles();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
