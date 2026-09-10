"use client";
import React, { Suspense, useEffect } from "react";
import { useExperienceStore } from "@/src/store/experienceStore";
class Boundary extends React.Component<
  React.PropsWithChildren<{ id: string; fallback?: React.ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    useExperienceStore
      .getState()
      .setAssetError(
        this.props.id,
        error instanceof Error ? error.message : "Asset failed",
      );
  }
  render() {
    return this.state.failed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}
function Resolved({ id, children }: React.PropsWithChildren<{ id: string }>) {
  useEffect(() => {
    useExperienceStore.getState().setAssetError(id, null);
  }, [id]);
  return children;
}
function Pending({ id }: { id: string }) {
  useEffect(() => {
    const timer = setTimeout(
      () =>
        useExperienceStore
          .getState()
          .setAssetError(
            id,
            "Loading timed out. Check the connection or retry.",
          ),
      15000,
    );
    return () => clearTimeout(timer);
  }, [id]);
  return null;
}
export function AssetBoundary({
  id,
  children,
  fallback,
}: React.PropsWithChildren<{ id: string; fallback?: React.ReactNode }>) {
  return (
    <Boundary id={id} fallback={fallback}>
      <Suspense
        fallback={
          <>
            <Pending id={id} />
            {fallback}
          </>
        }
      >
        <Resolved id={id}>{children}</Resolved>
      </Suspense>
    </Boundary>
  );
}
