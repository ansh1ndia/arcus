"use client";

export type LockScreenMetadata = {
  workoutName: string;
  exerciseName: string | null;
  weightLabel: string | null;
  reps: number | null;
  setNumber: number;
  totalSets: number;
  elapsedMinutes: number;
  restRemainingSeconds: number | null;
  paused: boolean;
};

export type LockScreenActions = {
  skipRestTimer: () => void;
  extendRestTimer: (seconds: number) => void;
  pauseWorkoutTimer: () => void;
  resumeWorkoutTimer: () => void;
};

const PREFERENCE_KEY = "arcus_lockscreen_companion_enabled";
const ACTIONS = ["nexttrack", "seekforward", "play", "pause"] as const satisfies readonly MediaSessionAction[];
const ARTWORK = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

let audio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;
let active = false;
let mediaPaused = false;
let actions: LockScreenActions | null = null;

function mediaSession(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
}

function createSilentWav(): Blob {
  const sampleRate = 8000;
  const samples = new Uint8Array(sampleRate).fill(128);
  const bytes = new ArrayBuffer(44 + samples.length);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, "data"); view.setUint32(40, samples.length, true); new Uint8Array(bytes, 44).set(samples);
  return new Blob([bytes], { type: "audio/wav" });
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audioUrl = URL.createObjectURL(createSilentWav());
    audio = new Audio(audioUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    audio.volume = 1;
  }
  return audio;
}

function bindActions(next: LockScreenActions): void {
  actions = next;
  const session = mediaSession();
  if (!session) return;
  const handlers: Record<(typeof ACTIONS)[number], MediaSessionActionHandler> = {
    nexttrack: () => { actions?.skipRestTimer(); void resume(); },
    seekforward: () => actions?.extendRestTimer(30),
    play: () => { actions?.resumeWorkoutTimer(); void resume(); },
    pause: () => { actions?.pauseWorkoutTimer(); pause(); },
  };
  for (const action of ACTIONS) {
    try { session.setActionHandler(action, handlers[action]); }
    catch { /* The browser may not support every optional media control. */ }
  }
}

function setMetadata(value: LockScreenMetadata): void {
  const session = mediaSession();
  if (!session || typeof MediaMetadata === "undefined") return;
  const rest = value.restRemainingSeconds;
  const time = rest === null ? null : `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`;
  const exercise = value.exerciseName ?? "Choose your next exercise";
  session.metadata = new MediaMetadata({
    title: rest !== null
      ? `⏳ Rest: ${time} remaining`
      : value.exerciseName
        ? `🏋️ Set ${Math.min(Math.max(value.setNumber, 1), Math.max(value.totalSets, 1))} of ${Math.max(value.totalSets, 1)}: ${value.exerciseName}`
        : "🏋️ Workout in progress",
    artist: rest !== null
      ? `Next: ${exercise} (${value.weightLabel ?? "—"} × ${value.reps ?? "—"})`
      : value.exerciseName
        ? `Target: ${value.weightLabel ?? "—"} × ${value.reps ?? "—"} reps`
        : "Ready for your next set",
    album: rest !== null
      ? `ARCUS · ${value.workoutName} (Elapsed: ${value.elapsedMinutes}m)`
      : "ARCUS · Workout in Progress",
    artwork: ARTWORK,
  });
  session.playbackState = value.paused || mediaPaused ? "paused" : "playing";
}

async function start(value: LockScreenMetadata, nextActions: LockScreenActions): Promise<boolean> {
  const session = mediaSession();
  if (!session) return false;
  if (!active) mediaPaused = false;
  active = true;
  bindActions(nextActions);
  setMetadata(value);
  const player = ensureAudio();
  if (player?.paused && !mediaPaused) {
    try { await player.play(); }
    catch { /* Metadata may still be available; retry on the next user gesture. */ }
  }
  return true;
}

async function unlock(): Promise<void> {
  if (!active || mediaPaused || !audio?.paused) return;
  try { await audio.play(); }
  catch { /* Mobile browsers require a fresh user gesture. */ }
}

function pause(): void {
  mediaPaused = true;
  audio?.pause();
  const session = mediaSession();
  if (session) session.playbackState = "paused";
}

async function resume(): Promise<void> {
  mediaPaused = false;
  const session = mediaSession();
  if (session) session.playbackState = "playing";
  await unlock();
}

function update(value: LockScreenMetadata): void {
  if (active) setMetadata(value);
}

function stop(): void {
  active = false;
  mediaPaused = false;
  actions = null;
  const session = mediaSession();
  if (session) {
    for (const action of ACTIONS) {
      try { session.setActionHandler(action, null); }
      catch { /* Ignore unsupported actions while cleaning up. */ }
    }
    session.metadata = null;
    session.playbackState = "none";
  }
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio = null;
  }
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
}

export function readLockScreenCompanionEnabled(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(PREFERENCE_KEY) !== "false";
  } catch { return true; }
}

export function writeLockScreenCompanionEnabled(enabled: boolean): void {
  try { window.localStorage.setItem(PREFERENCE_KEY, String(enabled)); }
  catch { /* Treat the selection as temporary if browser storage is unavailable. */ }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("arcus-lockscreen-companion-change", { detail: enabled }));
}

export const LockScreenCompanion = { start, update, unlock, pause, resume, stop };
