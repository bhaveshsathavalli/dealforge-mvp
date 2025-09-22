/**
 * Feature flags for the application
 */

/**
 * Check if the facts pipeline feature is enabled
 * @returns true if FACTS_PIPELINE_ENABLED is set to 'true', false otherwise
 */
export function isFactsPipelineEnabled(): boolean {
  return process.env.FACTS_PIPELINE_ENABLED === 'true';
}
