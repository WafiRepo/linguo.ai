import { Asset } from "expo-asset";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { Platform } from "react-native";

// Short, playful sound effects for Role Play (made for this app, see
// assets/audio/sfx).
const SOURCES = {
  ding: require("@/assets/audio/sfx/ding.wav"), // a right answer
  pop: require("@/assets/audio/sfx/pop.wav"), // tapping Bu Guru's face
  boing: require("@/assets/audio/sfx/boing.wav"), // tickling her (3 quick taps)
  stamp: require("@/assets/audio/sfx/stamp.wav"), // the PASS stamp lands
  tada: require("@/assets/audio/sfx/tada.wav"), // the PASS stamp is earned
} as const;

export type SoundEffect = keyof typeof SOURCES;

/** Plays a sound effect. Never throws: a missing sound must not break a lesson. */
export function playSfx(name: SoundEffect, volume = 0.6) {
  try {
    if (Platform.OS === "web") playOnWeb(name, volume);
    else playOnPhone(name, volume);
  } catch {
    // Sound is a bonus.
  }
}

// ---- Phone: one expo-audio player per sound, created on first use ----
const players: Partial<Record<SoundEffect, AudioPlayer>> = {};

function playOnPhone(name: SoundEffect, volume: number) {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  player.volume = volume;
  player.seekTo(0).catch(() => {});
  player.play();
}

// ---- Web: browsers (Safari on iPad above all) refuse a sound that no tap
// started, and expo-audio left that refusal uncaught (a red error screen).
// Here every refusal is caught, and the first tap unlocks all the sounds so
// later ones (a right answer) may play. ----
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

/** Inside a tap: play the other sounds once, silently, so Safari allows them later. */
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

function playOnWeb(name: SoundEffect, volume: number) {
  // Older Safari has no userActivation: try anyway, a refusal is caught.
  if (!unlocked && (navigator.userActivation?.isActive ?? true)) unlockAll(name);
  const audio = element(name);
  audio.muted = false;
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
