/**
 * Analytics are disabled for the child-directed Taiwan pilot.
 * Keep existing call sites inert: no SDK instance, network, or persisted queue.
 * Re-enabling collection requires a separate privacy review and consent design.
 */
interface DisabledAnalytics {
  capture: (event: string, properties?: unknown) => void;
  identify: (id: string, properties?: unknown) => void;
  reset: () => void;
}
const ignore = () => {};
export const posthog: DisabledAnalytics = {
  capture: ignore,
  identify: ignore,
  reset: ignore,
};
