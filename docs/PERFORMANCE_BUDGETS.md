# Performance certification

Forge treats device performance as a release contract. The project manifest declares memory, draw-call, triangle, and target-FPS budgets. A runtime or telemetry worker can pass a real-device sample to evaluatePerformanceSample and receive a structured pass/fail result with a ratio for every metric.

The check is intentionally strict for production certification:

- every memory and geometry metric must be at or below its budget
- measured FPS must meet the declared target
- failures retain their metric name, value, budget, unit, and ratio for dashboards

The performance:audit command validates the canonical project budgets and prints a self-consistent reference sample. Real device data should be collected through the existing telemetry endpoint and evaluated before a production release.
