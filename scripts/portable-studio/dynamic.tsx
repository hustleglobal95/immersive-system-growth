import { lazy, Suspense, type ComponentType } from 'react';
/** Host adapter: the portable edition is client-only, with the same lazy components. */
export default function dynamic<P extends object>(loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>) {
  const Component = lazy(async () => { const result = await loader(); return typeof result === 'function' ? { default: result } : result as { default: ComponentType<P> }; });
  return function Dynamic(props: P) { return <Suspense fallback={null}><Component {...props}/></Suspense>; };
}
