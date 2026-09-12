// Keep AI closed in the child-directed build until the documented P0 AI
// consent, service authorization, output safety and vendor reviews pass
// (see docs/REQUIREMENTS-DISTRIBUSI-SD.md section 7). This is intentionally
// not a client preference or public environment flag.
const RELEASE_READY = false;

// Developer-only escape hatch so the AI teacher can still be exercised while
// building it. __DEV__ is compiled to `false` in every release/production
// build (EAS build profiles, `expo run:android --variant release`, etc.), so
// this can NEVER unlock AI for a real student — only for `expo start` /
// `expo run:android` debug builds on the developer's own device. Do not
// wire this to an env var or remote config: that would make it reachable
// from a shipped build. Flip RELEASE_READY above instead once the P0 AI
// checklist actually passes.
const DEV_AI_TESTING_OVERRIDE = true;

export const CHILD_AI_RELEASE_READY =
  RELEASE_READY || (__DEV__ && DEV_AI_TESTING_OVERRIDE);
