import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'
import { logger } from '../utils/logger'

function logMetric(metric: Metric) {
  logger.info('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  })
}

export function reportWebVitals() {
  onCLS(logMetric)
  onINP(logMetric)
  onLCP(logMetric)
  onFCP(logMetric)
  onTTFB(logMetric)
}
