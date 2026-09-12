// Keep AI closed in the child-directed build until the documented P0 AI
// consent, service authorization, output safety and vendor reviews pass
// (see docs/REQUIREMENTS-DISTRIBUSI-SD.md section 7). This is intentionally
// not a client preference or public environment flag.
const RELEASE_READY = false;

// Developer-only escape hatch so the AI teacher can still be exercised while
// building it. __DEV__ is compiled to `false` in every release/production
// build (EAS build profiles, `expo run:android --variant release`, etc.), so
// this can NEVER unlock AI for a real student — only for `expo start` /
// `expo run:android` debug builds on the developer's own device.
const DEV_AI_TESTING_OVERRIDE = true;

// Standalone-build escape hatch for testing the AI teacher on a device with
// no Metro/laptop attached, WITHOUT the P0 AI checklist having passed. Only
// true when a build was explicitly compiled with EXPO_PUBLIC_AI_TESTING_UNLOCK
// set — the default "preview"/"production" eas.json profiles never set it,
// only the separate "preview-ai-testing" profile does, so a normal build for
// anyone else stays locked. AI_TESTING_ACTIVE below is used to show an
// unmissable in-app warning whenever either escape hatch is live, so this
// specific install can never be mistaken for a safety-reviewed build.
// Never distribute a build made with this flag to actual students/schools.
const AI_TESTING_UNLOCK_ENV = process.env.EXPO_PUBLIC_AI_TESTING_UNLOCK === "true";

export const AI_TESTING_ACTIVE =
  !RELEASE_READY && ((__DEV__ && DEV_AI_TESTING_OVERRIDE) || AI_TESTING_UNLOCK_ENV);

export const CHILD_AI_RELEASE_READY = RELEASE_READY || AI_TESTING_ACTIVE;
