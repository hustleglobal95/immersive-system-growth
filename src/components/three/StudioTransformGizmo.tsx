"use client";

import { useLayoutEffect, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import type { Group } from "three";
import { useStudioEditor } from "@/src/components/runtime/StudioEditorContext";
import type { Vec3 } from "@/src/types/experience";

export function StudioTransformGizmo() {
  const editor = useStudioEditor();
  const proxy = useRef<Group>(null);
  const dragging = useRef(false);
  const startValue = useRef<Vec3>([0, 0, 0]);
  const startPosition = useRef<Vec3>([0, 0, 0]);

  useLayoutEffect(() => {
    if (!editor || !proxy.current || dragging.current) return;
    const object = proxy.current;
    const position: Vec3 = editor.mode === "translate" ? editor.display ?? editor.value : editor.anchor;
    const rotation: Vec3 = editor.mode === "rotate" ? editor.value : [0, 0, 0];
    const scale: Vec3 = editor.mode === "scale" ? editor.value : [1, 1, 1];
    object.position.set(...position);
    object.rotation.set(...rotation);
    object.scale.set(...scale);
  }, [editor]);

  if (!editor) return null;
  const emit = () => {
    const object = proxy.current;
    if (!object) return;
    const value = editor.mode === "translate"
      ? editor.display
        ? [
            startValue.current[0] + object.position.x - startPosition.current[0],
            startValue.current[1] + object.position.y - startPosition.current[1],
            startValue.current[2] + object.position.z - startPosition.current[2],
          ]
        : object.position.toArray()
      : editor.mode === "rotate"
        ? [object.rotation.x, object.rotation.y, object.rotation.z]
        : object.scale.toArray();
    editor.onChange(value as Vec3);
  };
  const snap = editor.snap || null;
  return (
    <TransformControls
      mode={editor.mode}
      space={editor.mode === "translate" ? "world" : "local"}
      size={0.72}
      translationSnap={snap}
      rotationSnap={snap}
      scaleSnap={snap}
      onMouseDown={() => {
        dragging.current = true;
        startValue.current = [...editor.value];
        const position = proxy.current?.position.toArray();
        startPosition.current = position ? position as Vec3 : [0, 0, 0];
        editor.onBegin();
      }}
      onObjectChange={emit}
      onMouseUp={() => { emit(); dragging.current = false; editor.onEnd(); }}
    >
      <group ref={proxy}>
        <mesh renderOrder={999}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#ff6a2b" depthTest={false} transparent opacity={0.95} />
        </mesh>
      </group>
    </TransformControls>
  );
}
