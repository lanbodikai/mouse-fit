import { Box3, BufferAttribute, BufferGeometry, MeshBasicMaterial, Vector3 } from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { HandPose } from "./articulated-hand";

// A single implicit skin joins palm and phalanges without deformation seams.
export function createHandSurface(pose: HandPose): BufferGeometry {
  const direction = pose.knuckle.clone().sub(pose.wrist).normalize();
  const up = new Vector3(0, direction.z, -direction.y);
  const palmCenter = pose.wrist.clone().lerp(pose.knuckle, 0.5);
  const palmLength = pose.wrist.distanceTo(pose.knuckle);
  const capsules: { a: Vector3; b: Vector3; r: number; taper: number }[] = [];
  const bounds = new Box3().setFromPoints([pose.wrist, pose.knuckle]);
  for (const digit of pose.digits) {
    for (let i = 0; i < digit.joints.length - 1; i++) {
      capsules.push({ a: digit.joints[i], b: digit.joints[i + 1], r: digit.radius, taper: i === 0 ? 0.12 : 0 });
    }
    const anchor = pose.wrist.clone().lerp(pose.knuckle, digit.name === "thumb" ? 0.38 : 0.72);
    anchor.x += (digit.joints[0].x - pose.knuckle.x) * 0.78;
    capsules.push({ a: anchor, b: digit.joints[0], r: digit.radius * 1.10, taper: 0.20 });
    digit.joints.forEach((p) => bounds.expandByPoint(p));
  }
  bounds.expandByPoint(palmCenter.clone().add(new Vector3(pose.palmWidth / 2, pose.palmThickness, 0)));
  bounds.expandByPoint(palmCenter.clone().add(new Vector3(-pose.palmWidth / 2, -pose.palmThickness, 0)));
  bounds.expandByScalar(1.5);
  const span = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const resolution = 96;
  const material = new MeshBasicMaterial();
  const marching = new MarchingCubes(resolution, material, false, false, 90000);
  marching.isolation = 0;
  const packed = capsules.map(({ a, b, r, taper }) => {
    const d = b.clone().sub(a);
    return { x: a.x, y: a.y, z: a.z, dx: d.x, dy: d.y, dz: d.z, len2: d.lengthSq(), r, taper };
  });
  function smoothMin(a: number, b: number) {
    const k = 0.22;
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }
  let offset = 0;
  for (let z = 0; z < resolution; z++) {
    const pz = bounds.min.z + z / resolution * span.z;
    for (let y = 0; y < resolution; y++) {
      const py = bounds.min.y + y / resolution * span.y;
      for (let x = 0; x < resolution; x++) {
        const px = bounds.min.x + x / resolution * span.x;
        const cx = px - palmCenter.x, cy = py - palmCenter.y, cz = pz - palmCenter.z;
        const ly = cy * up.y + cz * up.z;
        const lz = cy * direction.y + cz * direction.z;
        // Broad knuckles taper into a rounded wrist, rather than an ellipsoid
        // that pinches both ends into a flat paddle.
        const q = Math.max(0, Math.min(1, lz / palmLength + 0.5));
        const rx = pose.palmWidth * (0.27 + 0.21 * Math.sin(Math.PI * q * 0.85));
        const ry = pose.palmThickness * 0.5 * (0.8 + 0.2 * Math.sin(Math.PI * q));
        const k0 = Math.hypot(cx / rx, ly / ry);
        const k1 = Math.hypot(cx / (rx * rx), ly / (ry * ry));
        const crossDistance = k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -ry;
        const endDistance = Math.abs(lz) - palmLength / 2 + 0.15;
        let distance = Math.min(Math.max(crossDistance, endDistance), 0)
          + Math.hypot(Math.max(crossDistance, 0), Math.max(endDistance, 0)) - 0.15;
        for (const c of packed) {
          const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
          const t = Math.max(0, Math.min(1, (dx * c.dx + dy * c.dy + dz * c.dz) / Math.max(1e-9, c.len2)));
          const d = Math.hypot(dx - t * c.dx, dy - t * c.dy, dz - t * c.dz) - c.r * (1 + c.taper * (1 - t));
          distance = smoothMin(distance, d);
        }
        marching.field[offset++] = -distance;
      }
    }
  }
  marching.update();
  const count = marching.geometry.drawRange.count;
  const geometry = new BufferGeometry();
  for (const name of ["position", "normal"]) {
    const source = marching.geometry.getAttribute(name);
    geometry.setAttribute(name, new BufferAttribute(new Float32Array(source.array.slice(0, count * 3)), 3));
  }
  geometry.scale(span.x / 2, span.y / 2, span.z / 2);
  geometry.translate(center.x, center.y, center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  marching.geometry.dispose();
  material.dispose();
  return geometry;
}
