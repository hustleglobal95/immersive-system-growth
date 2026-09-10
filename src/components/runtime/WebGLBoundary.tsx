"use client";
import React from "react";
import { useExperienceStore } from "@/src/store/experienceStore";
export class WebGLBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("3D renderer unavailable", error);
    useExperienceStore.getState().setWebglStatus("failed");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
