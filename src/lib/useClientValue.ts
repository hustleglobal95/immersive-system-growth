import { useSyncExternalStore } from "react";

// Nothing to subscribe to: these are facts that are fixed for the life of the document
// (the URL a workspace was opened with, a value already sitting in local storage). This is
// the same shape ExperienceRuntime and InquiryForm use to read a client-only fact without
// setting state inside an effect, and it keeps the server snapshot honest so prerendered
// markup is identical for everyone.
const subscribeNever = () => () => {};

/**
 * Read a client-only value during render. `read` must return a primitive, or a value that is
 * referentially stable between calls: React compares snapshots with Object.is, so returning a
 * fresh object or array every call will spin. Return a string and parse it downstream.
 */
export function useClientValue<T extends string | number | boolean | null>(
  read: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(subscribeNever, read, () => serverValue);
}

/** The current query string, or "" while prerendering. */
export function readSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}

/** A stored string, or "" when storage is unavailable (private mode, blocked site data). */
export function readStored(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
