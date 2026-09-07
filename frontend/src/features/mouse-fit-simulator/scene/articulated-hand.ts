import { Box3, DoubleSide, Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector3 } from "three";
import type { GripStyle, HandConfiguration } from "../types";

export type Digit = {
  name: string;
  joints: Vector3[];
  radius: number;
  contact: Vector3;
  normal: Vector3;
  lengths: number[];
};
export type HandPose = {
  wrist: Vector3;
  knuckle: Vector3;
  palmWidth: number;
  palmThickness: number;
  digits: Digit[];
  bounds: Box3;
  handLength: number;
};

const UP = new Vector3(0, 1, 0);

// All values are centimeters, shared with the fitted mouse. No pose-dependent
// scaling: the wrist-to-MCP distance plus the extended middle finger is L.
export function solveTwoBones(root: Vector3, end: Vector3, a: number, b: number, pole: Vector3) {
  const delta = end.clone().sub(root);
  const distance = delta.length();
  if (distance > a + b + 1e-6 || distance < Math.abs(a - b) - 1e-6) return null;
  const direction = delta.divideScalar(Math.max(distance, 1e-9));
  const bend = pole.clone().addScaledVector(direction, -pole.dot(direction)).normalize();
  const along = (a * a - b * b + distance * distance) / (2 * Math.max(distance, 1e-9));
  return root.clone().addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
}

export function createHandPose(surface: Object3D, hand: HandConfiguration, grip: GripStyle): HandPose {
  surface.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(surface, true);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const side = hand.handedness === "right" ? 1 : -1;
  // Printable shells can have reversed face winding. Sample both sides using
  // an independent proxy, without changing their rendered materials.
  const samplingSurface = surface.clone(true);
  const samplingMaterial = new MeshBasicMaterial({ side: DoubleSide });
  samplingSurface.traverse((node) => { if ((node as Mesh).isMesh) (node as Mesh).material = samplingMaterial; });
  samplingSurface.updateMatrixWorld(true);
  const ray = new Raycaster();
  function contact(origin: Vector3, direction: Vector3) {
    ray.set(origin, direction);
    const hit = ray.intersectObject(samplingSurface, true)[0];
    return hit?.point.clone() ?? null;
  }
  function deck(x: number, z: number) {
    return contact(new Vector3(x, bounds.max.y + 20, z), new Vector3(0, -1, 0));
  }
  function button(x: number, z: number) {
    for (const [dx, dz] of [[0, 0], [0.15, 0], [-0.15, 0], [0, -0.3], [0.3, -0.3], [-0.3, -0.3]]) {
      const hit = deck(x + dx, z + dz);
      if (hit) return hit;
    }
    return null;
  }
  function flank(sign: number, z: number) {
    for (const fraction of [0.48, 0.58, 0.35, 0.68]) {
      const y = bounds.min.y + size.y * fraction;
      const hit = contact(new Vector3(center.x + sign * (size.x + 5), y, z), new Vector3(-sign, 0, 0));
      if (hit) return hit;
    }
    throw new Error("Mouse side contact could not be found.");
  }

  const radius = hand.fingerThicknessCm * 0.43;
  const middleLength = hand.middleFingerLengthCm;
  const palmLength = hand.lengthCm - middleLength;
  const thickness = hand.lengthCm * 0.115;
  const tipZ = center.z + size.z * (grip === "claw" ? 0.36 : grip === "palm" ? 0.40 : 0.39);
  const indexContact = button(center.x + side * size.x * 0.14, tipZ - 0.25);
  const middleContact = button(center.x - side * size.x * 0.13, tipZ);
  if (!indexContact || !middleContact) throw new Error("Mouse button contact could not be found.");
  const knuckle = new Vector3(
    center.x - side * hand.palmWidthCm * 0.11,
    Math.max(
      Math.max(indexContact.y, middleContact.y) + radius + (grip === "claw" ? 1.55 : grip === "palm" ? 0.25 : 1.0),
      bounds.max.y + thickness / 2 + (grip === "claw" ? 0.45 : grip === "palm" ? 0.05 : 1.0),
    ),
    tipZ - middleLength * (grip === "claw" ? 0.58 : grip === "palm" ? 0.78 : 0.70),
  );
  // Place the wrist behind the mouse. Find a palm pitch that clears the shell
  // using several cross-sections, rather than guessing from catalog height.
  let wristY = knuckle.y - (grip === "claw" ? 1.5 : 0.3);
  for (const q of [0.45, 0.6, 0.72, 0.84]) {
    const z = knuckle.z - palmLength * (1 - q);
    const hit = deck(knuckle.x, z);
    if (!hit) continue;
    const bottomRadius = thickness / 2 * (0.8 + 0.2 * Math.sin(Math.PI * q));
    const clearance = grip === "fingertip" ? 0.65 : grip === "claw" ? 0.08 : 0.02;
    wristY = Math.max(wristY, (hit.y + bottomRadius + clearance - q * knuckle.y) / (1 - q));
  }
  const wristDeltaY = Math.min(palmLength * 0.55, Math.max(-palmLength * 0.55, wristY - knuckle.y));
  const wrist = new Vector3(knuckle.x, knuckle.y + wristDeltaY,
    knuckle.z - Math.sqrt(palmLength * palmLength - wristDeltaY * wristDeltaY));

  const definitions = [
    { name: "index", x: 0.29, length: 0.91, r: 0.96, point: indexContact, normal: UP, z: -0.10 },
    { name: "middle", x: 0, length: 1, r: 1, point: middleContact, normal: UP, z: 0 },
    { name: "ring", x: -0.18, length: 0.93, r: 0.91, point: flank(-side, center.z + size.z * 0.12), normal: new Vector3(-side, 0, 0), z: -0.2 },
    { name: "pinky", x: -0.37, length: 0.72, r: 0.75, point: flank(-side, center.z - size.z * 0.09), normal: new Vector3(-side, 0, 0), z: -0.7 },
  ];
  const digits: Digit[] = [];
  for (const def of definitions) {
    const r = radius * def.r;
    const root = knuckle.clone().add(new Vector3(side * hand.palmWidthCm * def.x, 0, def.z));
    const end = def.point.clone().addScaledVector(def.normal, r);
    const total = middleLength * def.length - r; // cap radius completes the measured fingertip
    const lengths = [total * 0.47, total * 0.30, total * 0.23];
    // Solve MCP/PIP/DIP with an independently angled terminal phalanx.
    let joints: Vector3[] | null = null;
    for (const angle of [grip === "claw" ? 1.1 : grip === "palm" ? 0.25 : 0.65, 0.5, 0, 1.3]) {
      const horizontal = end.clone().sub(root).setY(0).normalize();
      const terminal = horizontal.multiplyScalar(Math.cos(angle)).addScaledVector(UP, -Math.sin(angle));
      const dip = end.clone().addScaledVector(terminal, -lengths[2]);
      const pip = solveTwoBones(root, dip, lengths[0], lengths[1], UP);
      if (pip) { joints = [root, pip, dip, end]; break; }
    }
    if (!joints) {
      // Side digits can exceed reach on very wide shells. Keep anatomy intact,
      // bring the root toward the edge of the palm, and solve again.
      const reach = total * 0.96;
      if (root.distanceTo(end) > reach) root.copy(end.clone().add(root.clone().sub(end).setLength(reach)));
      const pip = solveTwoBones(root, end, lengths[0], lengths[1] + lengths[2], UP);
      if (!pip) throw new Error(`Unable to fit ${def.name} without stretching.`);
      joints = [root, pip, pip.clone().lerp(end, lengths[1] / (lengths[1] + lengths[2])), end];
    }
    digits.push({ name: def.name, joints, radius: r, contact: def.point, normal: def.normal, lengths });
  }
  const thumbContact = flank(side, center.z - size.z * 0.14);
  const thumbRadius = radius * 1.12;
  const thumbEnd = thumbContact.clone().add(new Vector3(side * thumbRadius, 0, 0));
  const thumbRoot = wrist.clone().lerp(knuckle, 0.55).add(new Vector3(side * hand.palmWidthCm * 0.30, -0.3, 0));
  const thumbLength = hand.thumbLengthCm - thumbRadius;
  if (thumbRoot.distanceTo(thumbEnd) > thumbLength * 0.97) {
    thumbRoot.copy(thumbEnd.clone().add(thumbRoot.clone().sub(thumbEnd).setLength(thumbLength * 0.97)));
  }
  const thumbJoint = solveTwoBones(thumbRoot, thumbEnd, thumbLength * 0.55, thumbLength * 0.45, new Vector3(side, 0.5, 0));
  if (!thumbJoint) throw new Error("Unable to fit thumb without stretching.");
  digits.push({ name: "thumb", joints: [thumbRoot, thumbJoint, thumbEnd], radius: thumbRadius,
    contact: thumbContact, normal: new Vector3(side, 0, 0), lengths: [thumbLength * 0.55, thumbLength * 0.45] });
  samplingMaterial.dispose();
  return { wrist, knuckle, palmWidth: hand.palmWidthCm, palmThickness: thickness, digits, bounds, handLength: hand.lengthCm };
}
