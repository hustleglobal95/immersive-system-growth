# Validation

Forge separates structural validation from cinematic heuristics.

```bash
npm run doctor
npm run experience:validate
npm run cinematic:audit
npm run assets:audit
npm test
npm run typecheck
npm run lint
npm run build
```

`experience:validate` fails on malformed ranges, vectors, IDs and missing scene relationships. `cinematic:audit` reports suspicious camera distance, extreme FOV, long scene copy and discontinuous camera or persistent-object states. Warnings are not automatically wrong, but they require an intentional design reason.

Use `npm run scene:report` for a concise timeline printout during reviews.
