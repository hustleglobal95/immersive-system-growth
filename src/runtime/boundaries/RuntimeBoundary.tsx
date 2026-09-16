"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { runtimeHealth, type RuntimeSubsystem } from "@/src/runtime/health/runtimeHealth";

interface RuntimeBoundaryProps {
  subsystem: RuntimeSubsystem;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface RuntimeBoundaryState {
  error: Error | null;
}

export class RuntimeBoundary extends Component<RuntimeBoundaryProps, RuntimeBoundaryState> {
  state: RuntimeBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RuntimeBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    runtimeHealth.report(this.props.subsystem, "degraded", error.message);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previous: RuntimeBoundaryProps) {
    if (previous.subsystem !== this.props.subsystem && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return this.props.fallback ?? null;
  }
}

export function reportRuntimeReady(subsystem: RuntimeSubsystem, metrics?: Record<string, number | string | boolean>) {
  runtimeHealth.report(subsystem, "healthy", undefined, metrics);
}

export function reportRuntimeUnavailable(subsystem: RuntimeSubsystem, message: string) {
  runtimeHealth.report(subsystem, "unavailable", message);
}
