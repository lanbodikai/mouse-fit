"use client";

import { useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import type { MouseModelManifestEntry } from "../types";

const CENTIMETERS_PER_MILLIMETER = 0.1;
const stlGeometryCache = new Map<string, Promise<BufferGeometry>>();
const AXIS_PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

type PrincipalAxis = {
  axis: Vector3;
  size: number;
};

function projectionRange(
  position: BufferAttribute,
  center: Vector3,
  axis: Vector3,
): { minimum: number; maximum: number; size: number } {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const projection =
      (position.getX(index) - center.x) * axis.x +
      (position.getY(index) - center.y) * axis.y +
      (position.getZ(index) - center.z) * axis.z;
    minimum = Math.min(minimum, projection);
    maximum = Math.max(maximum, projection);
  }
  return { minimum, maximum, size: maximum - minimum };
}

function principalAxes(position: BufferAttribute): {
  center: Vector3;
  axes: PrincipalAxis[];
} {
  const center = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    center.x += position.getX(index);
    center.y += position.getY(index);
    center.z += position.getZ(index);
  }
  center.multiplyScalar(1 / Math.max(position.count, 1));

  const covariance = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let index = 0; index < position.count; index += 1) {
    const values = [
      position.getX(index) - center.x,
      position.getY(index) - center.y,
      position.getZ(index) - center.z,
    ];
    for (let row = 0; row < 3; row += 1) {
      for (let column = row; column < 3; column += 1) {
        covariance[row][column] += values[row] * values[column];
      }
    }
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = row; column < 3; column += 1) {
      covariance[row][column] /= Math.max(position.count, 1);
      covariance[column][row] = covariance[row][column];
    }
  }

  const vectors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iteration = 0; iteration < 50; iteration += 1) {
    let left = 0;
    let right = 1;
    for (const [candidateLeft, candidateRight] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      if (
        Math.abs(covariance[candidateLeft][candidateRight]) >
        Math.abs(covariance[left][right])
      ) {
        left = candidateLeft;
        right = candidateRight;
      }
    }
    if (Math.abs(covariance[left][right]) < 1e-10) break;

    const angle =
      0.5 *
      Math.atan2(
        2 * covariance[left][right],
        covariance[right][right] - covariance[left][left],
      );
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const leftValue = covariance[left][left];
    const rightValue = covariance[right][right];
    const crossValue = covariance[left][right];

    for (let index = 0; index < 3; index += 1) {
      if (index === left || index === right) continue;
      const indexLeft = covariance[index][left];
      const indexRight = covariance[index][right];
      covariance[index][left] = covariance[left][index] =
        cosine * indexLeft - sine * indexRight;
      covariance[index][right] = covariance[right][index] =
        sine * indexLeft + cosine * indexRight;
    }
    covariance[left][left] =
      cosine ** 2 * leftValue -
      2 * sine * cosine * crossValue +
      sine ** 2 * rightValue;
    covariance[right][right] =
      sine ** 2 * leftValue +
      2 * sine * cosine * crossValue +
      cosine ** 2 * rightValue;
    covariance[left][right] = covariance[right][left] = 0;

    for (let index = 0; index < 3; index += 1) {
      const vectorLeft = vectors[index][left];
      const vectorRight = vectors[index][right];
      vectors[index][left] = cosine * vectorLeft - sine * vectorRight;
      vectors[index][right] = sine * vectorLeft + cosine * vectorRight;
    }
  }

  const axes = [0, 1, 2].map((index) => {
    const axis = new Vector3(
      vectors[0][index],
      vectors[1][index],
      vectors[2][index],
    ).normalize();
    return { axis, size: projectionRange(position, center, axis).size };
  });
  return { center, axes };
}

function matchMouseAxes(
  axes: PrincipalAxis[],
  mouse: MouseModelManifestEntry,
): { length: Vector3; width: Vector3; height: Vector3 } {
  const targets = [
    mouse.dimensionsMm.lengthMm ?? 120,
    mouse.dimensionsMm.widthMm ?? 60,
    mouse.dimensionsMm.heightMm ?? 38,
  ];
  let best: (typeof AXIS_PERMUTATIONS)[number] = AXIS_PERMUTATIONS[0];
  let bestScore = Infinity;

  for (const permutation of AXIS_PERMUTATIONS) {
    const scaleLogs = permutation.map((axisIndex, semanticIndex) =>
      Math.log(Math.max(axes[axisIndex].size, 0.001) / targets[semanticIndex]),
    );
    const averageScaleLog =
      scaleLogs.reduce((sum, value) => sum + value, 0) / scaleLogs.length;
    const score = scaleLogs.reduce(
      (sum, value) => sum + (value - averageScaleLog) ** 2,
      0,
    );
    if (score < bestScore) {
      best = permutation;
      bestScore = score;
    }
  }

  return {
    length: axes[best[0]].axis.clone(),
    width: axes[best[1]].axis.clone(),
    height: axes[best[2]].axis.clone(),
  };
}

function levelUpAxis(
  position: BufferAttribute,
  center: Vector3,
  approximateUp: Vector3,
): Vector3 {
  const range = projectionRange(position, center, approximateUp);
  const bottomLimit = range.minimum + range.size * 0.45;
  const normalSum = new Vector3();
  const edgeA = new Vector3();
  const edgeB = new Vector3();
  const faceNormal = new Vector3();
  const first = new Vector3();
  const second = new Vector3();
  const third = new Vector3();

  for (let index = 0; index + 2 < position.count; index += 3) {
    first.fromBufferAttribute(position, index);
    second.fromBufferAttribute(position, index + 1);
    third.fromBufferAttribute(position, index + 2);
    const centroidProjection =
      ((first.x + second.x + third.x) / 3 - center.x) * approximateUp.x +
      ((first.y + second.y + third.y) / 3 - center.y) * approximateUp.y +
      ((first.z + second.z + third.z) / 3 - center.z) * approximateUp.z;
    if (centroidProjection > bottomLimit) continue;

    edgeA.subVectors(second, first);
    edgeB.subVectors(third, first);
    faceNormal.crossVectors(edgeA, edgeB);
    const areaWeight = faceNormal.length();
    if (areaWeight <= Number.EPSILON) continue;
    faceNormal.divideScalar(areaWeight);
    let alignment = faceNormal.dot(approximateUp);
    if (Math.abs(alignment) < 0.72) continue;
    if (alignment < 0) {
      faceNormal.negate();
      alignment *= -1;
    }
    normalSum.addScaledVector(faceNormal, areaWeight * alignment ** 4);
  }

  return normalSum.lengthSq() > 1e-8
    ? normalSum.normalize()
    : approximateUp.clone();
}

function orientStlGeometry(
  sourceGeometry: BufferGeometry,
  mouse: MouseModelManifestEntry,
): BufferGeometry {
  const geometry = sourceGeometry.index
    ? sourceGeometry.toNonIndexed()
    : sourceGeometry.clone();
  const position = geometry.getAttribute("position") as BufferAttribute;
  const { center, axes } = principalAxes(position);
  const matched = matchMouseAxes(axes, mouse);

  const heightRange = projectionRange(position, center, matched.height);
  let nearMinimum = 0;
  let nearMaximum = 0;
  const extremeBand = heightRange.size * 0.035;
  for (let index = 0; index < position.count; index += 1) {
    const projection =
      (position.getX(index) - center.x) * matched.height.x +
      (position.getY(index) - center.y) * matched.height.y +
      (position.getZ(index) - center.z) * matched.height.z;
    if (projection <= heightRange.minimum + extremeBand) nearMinimum += 1;
    if (projection >= heightRange.maximum - extremeBand) nearMaximum += 1;
  }
  if (nearMaximum > nearMinimum) matched.height.negate();

  const up = levelUpAxis(position, center, matched.height);
  const length = matched.length.addScaledVector(
    up,
    -matched.length.dot(up),
  ).normalize();
  // Keep the existing source +Y forward convention whenever it is available.
  if (length.y < 0) length.negate();
  const forward = length.clone().negate();
  const width = new Vector3().crossVectors(up, forward).normalize();
  const transform = new Matrix4().set(
    width.x, width.y, width.z, 0,
    up.x, up.y, up.z, 0,
    forward.x, forward.y, forward.z, 0,
    0, 0, 0, 1,
  );
  geometry.applyMatrix4(transform);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function loadStlGeometry(assetUrl: string): Promise<BufferGeometry> {
  const cached = stlGeometryCache.get(assetUrl);
  if (cached) return cached;

  const request = fetch(assetUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load mouse STL (${response.status}).`);
      }
      const buffer = await response.arrayBuffer();
      return new STLLoader().parse(buffer);
    });
  stlGeometryCache.set(assetUrl, request);
  return request;
}

function fitModel(source: Object3D, mouse: MouseModelManifestEntry): Object3D {
  const clone = source.clone(true);
  const bounds = new Box3().setFromObject(clone);
  const size = bounds.getSize(new Vector3());
  const targetWidth = (mouse.dimensionsMm.widthMm ?? 60) * CENTIMETERS_PER_MILLIMETER;
  const targetHeight = (mouse.dimensionsMm.heightMm ?? 38) * CENTIMETERS_PER_MILLIMETER;
  const targetLength = (mouse.dimensionsMm.lengthMm ?? 120) * CENTIMETERS_PER_MILLIMETER;
  const transform = mouse.transform;

  // Manifest transforms are intentionally data-driven: a model with a different
  // source axis convention only needs one manifest edit, never a component branch.
  clone.scale.set(
    (targetWidth / Math.max(size.x, 0.001)) * transform.scale[0],
    (targetHeight / Math.max(size.y, 0.001)) * transform.scale[1],
    (targetLength / Math.max(size.z, 0.001)) * transform.scale[2],
  );
  clone.rotation.set(...transform.rotation);
  clone.updateMatrixWorld(true);

  const fittedBounds = new Box3().setFromObject(clone);
  const fittedCenter = fittedBounds.getCenter(new Vector3());
  clone.position.set(
    transform.position[0] - fittedCenter.x,
    transform.position[1] - fittedBounds.min.y + 0.03,
    transform.position[2] - fittedCenter.z,
  );

  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (!object.material) object.material = new MeshStandardMaterial({ color: "#15191f", roughness: 0.38 });
  });
  return clone;
}

type MouseProps = {
  mouse: MouseModelManifestEntry;
  onSurfaceReady?: (surface: Object3D | null) => void;
};

function LoadedMouse({ mouse, onSurfaceReady }: MouseProps) {
  const { scene } = useGLTF(mouse.assetUrl);
  const fittedModel = useMemo(() => fitModel(scene, mouse), [mouse, scene]);
  useEffect(() => {
    fittedModel.updateMatrixWorld(true);
    onSurfaceReady?.(fittedModel);
    return () => onSurfaceReady?.(null);
  }, [fittedModel, onSurfaceReady]);

  return <primitive object={fittedModel} />;
}

function LoadedStlMouse({ mouse, onSurfaceReady }: MouseProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStlGeometry(mouse.assetUrl)
      .then((loadedGeometry) => {
        if (!cancelled) setGeometry(loadedGeometry);
      })
      .catch((error: unknown) => {
        // A single source file must not trip the scene-wide error boundary.
        // The model can be reselected after its asset is repaired.
        console.error(`Unable to load STL mouse model: ${mouse.id}`, error);
      });
    return () => {
      cancelled = true;
    };
  }, [mouse.assetUrl, mouse.id]);

  const fittedModel = useMemo(() => {
    if (!geometry) return null;
    // Imported scans use several source coordinate systems. Match their axes to
    // the catalog dimensions, then derive the up vector from the shell's flat
    // underside so every mouse sits level with no pitch or roll.
    const orientedGeometry = orientStlGeometry(geometry, mouse);
    const source = new Mesh(orientedGeometry, new MeshStandardMaterial({ color: "#555f6c", roughness: 0.55 }));
    return fitModel(source, mouse);
  }, [geometry, mouse]);

  useEffect(() => {
    fittedModel?.updateMatrixWorld(true);
    onSurfaceReady?.(fittedModel);
    return () => onSurfaceReady?.(null);
  }, [fittedModel, onSurfaceReady]);

  return fittedModel ? <primitive object={fittedModel} /> : null;
}

export default function ImportedMouseModel({ mouse, onSurfaceReady }: MouseProps) {
  const format = mouse.assetFormat ?? (mouse.assetUrl.endsWith(".stl") ? "stl" : "glb");
  return format === "stl" ? <LoadedStlMouse key={mouse.assetUrl} mouse={mouse} onSurfaceReady={onSurfaceReady} /> : <LoadedMouse key={mouse.assetUrl} mouse={mouse} onSurfaceReady={onSurfaceReady} />;
}
