import { AudioPlayer, createAudioPlayer } from "expo-audio";

// Short, playful sound effects for Role Play (made for this app, see
// assets/audio/sfx). Each one gets one player, created the first time it is
// played and reused after that.
const SOURCES = {
  ding: require("@/assets/audio/sfx/ding.wav"), // a right answer
  pop: require("@/assets/audio/sfx/pop.wav"), // tapping Bu Guru's face
  boing: require("@/assets/audio/sfx/boing.wav"), // tickling her (3 quick taps)
  stamp: require("@/assets/audio/sfx/stamp.wav"), // the PASS stamp lands
  tada: require("@/assets/audio/sfx/tada.wav"), // the PASS stamp is earned
} as const;

export type SoundEffect = keyof typeof SOURCES;

const players: Partial<Record<SoundEffect, AudioPlayer>> = {};

/** Plays a sound effect. Never throws: a missing sound must not break a lesson. */
export function playSfx(name: SoundEffect, volume = 0.6) {
  try {
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players[name] = player;
    }
    player.volume = volume;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a bonus.
  }
}
