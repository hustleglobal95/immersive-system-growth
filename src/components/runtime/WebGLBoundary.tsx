"use client";

import React from "react";

interface State { failed: boolean; }

export class WebGLBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Forge WebGL runtime failed", error); }
  render() {
    if (this.state.failed) {
      return (
        <div className="webgl-fallback" role="status">
          <p className="eyebrow">3D FALLBACK</p>
          <h2>The interactive 3D layer could not start.</h2>
          <p>The page content remains available. Try reloading or using a browser with WebGL enabled.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
