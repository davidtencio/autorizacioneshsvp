import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'

const LOG_PREFIX = '[web-vitals]'

function logMetric(metric: Metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  }

  // Baseline observability for phase 0; can be replaced by remote telemetry later.
  console.info(LOG_PREFIX, payload)
}

export function reportWebVitals() {
  onCLS(logMetric)
  onINP(logMetric)
  onLCP(logMetric)
  onFCP(logMetric)
  onTTFB(logMetric)
}
