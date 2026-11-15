import { Asset } from "expo-asset";

// Web version of lib/sfx.ts. Browsers (Safari on iPad above all) refuse to
// play a sound that no tap started, and expo-audio left that refusal
// uncaught (a red error screen). Here every refusal is caught, and the first
// tap unlocks all the sounds so later ones (a right answer) may play.
const SOURCES = {
  ding: require("@/assets/audio/sfx/ding.wav"),
  pop: require("@/assets/audio/sfx/pop.wav"),
  boing: require("@/assets/audio/sfx/boing.wav"),
  stamp: require("@/assets/audio/sfx/stamp.wav"),
  tada: require("@/assets/audio/sfx/tada.wav"),
} as const;

export type SoundEffect = keyof typeof SOURCES;

const elements: Partial<Record<SoundEffect, HTMLAudioElement>> = {};
let unlocked = false;

function element(name: SoundEffect): HTMLAudioElement {
  let audio = elements[name];
  if (!audio) {
    audio = new Audio(Asset.fromModule(SOURCES[name]).uri);
    audio.preload = "auto";
    elements[name] = audio;
  }
  return audio;
}

/** Inside a tap: play every sound once, silently, so Safari allows them later. */
function unlockAll(except: SoundEffect) {
  for (const name of Object.keys(SOURCES) as SoundEffect[]) {
    if (name === except) continue; // played for real right after
    const audio = element(name);
    audio.muted = true;
    audio
      .play()
      .then(() => {
        unlocked = true; // a tap allowed it: no need to try again
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  }
}

/** Plays a sound effect. Never throws: a missing sound must not break a lesson. */
export function playSfx(name: SoundEffect, volume = 0.6) {
  try {
    // Older Safari has no userActivation: try anyway, a refusal is caught.
    if (!unlocked && (navigator.userActivation?.isActive ?? true)) unlockAll(name);
    const audio = element(name);
    audio.muted = false;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Sound is a bonus.
  }
}
