"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { Group } from "three";
import { useStudioEditor } from "@/src/components/runtime/StudioEditorContext";
import type { Vec3 } from "@/src/types/experience";

export function StudioTransformGizmo() {
  const editor = useStudioEditor();
  const { invalidate } = useThree();
  // The controls and value emitter must manipulate the same stable Object3D.
  const proxy = useMemo(() => new Group(), []);
  const dragging = useRef(false);
  const startValue = useRef<Vec3>([0, 0, 0]);
  const startPosition = useRef<Vec3>([0, 0, 0]);

  useLayoutEffect(() => {
    if (!editor || dragging.current) return;
    const position: Vec3 = editor.mode === "translate" ? editor.display ?? editor.value : editor.anchor;
    const rotation: Vec3 = editor.mode === "rotate" ? editor.value : [0, 0, 0];
    const scale: Vec3 = editor.mode === "scale" ? editor.value : [1, 1, 1];
    proxy.position.set(...position);
    proxy.rotation.set(...rotation);
    proxy.scale.set(...scale);
    proxy.updateMatrixWorld(true);
    invalidate();
  }, [editor, proxy, invalidate]);

  if (!editor) return null;
  const emit = () => {
    if (!dragging.current) return;
    const value = editor.mode === "translate"
      ? editor.display
        ? [
            startValue.current[0] + proxy.position.x - startPosition.current[0],
            startValue.current[1] + proxy.position.y - startPosition.current[1],
            startValue.current[2] + proxy.position.z - startPosition.current[2],
          ]
        : proxy.position.toArray()
      : editor.mode === "rotate"
        ? [proxy.rotation.x, proxy.rotation.y, proxy.rotation.z]
        : proxy.scale.toArray();
    editor.onChange(value as Vec3);
    invalidate();
  };
  const snap = editor.snap || null;
  return (
    <group userData={{ studioHelper: true }}>
      <TransformControls
        object={proxy}
        mode={editor.mode}
        space={editor.mode === "translate" ? "world" : "local"}
        size={0.72}
        translationSnap={snap}
        rotationSnap={snap}
        scaleSnap={snap}
        onMouseDown={() => {
          dragging.current = true;
          startValue.current = [...editor.value];
          startPosition.current = proxy.position.toArray() as Vec3;
          editor.onBegin();
        }}
        onObjectChange={emit}
        onMouseUp={() => { emit(); dragging.current = false; editor.onEnd(); }}
      />
      <primitive object={proxy} userData={{ studioHelper: true }}>
        <mesh renderOrder={999}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#ff6a2b" depthTest={false} transparent opacity={0.95} />
        </mesh>
      </primitive>
    </group>
  );
}
