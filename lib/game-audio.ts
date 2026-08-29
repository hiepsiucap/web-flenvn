import "client-only";

export type GameSound = "type" | "correct" | "incorrect" | "complete";
type RecordedGameSound = Exclude<GameSound, "type">;

let audioContext: AudioContext | null = null;
let lastTypingSoundAt = 0;
const audioPlayers = new Map<RecordedGameSound, HTMLAudioElement>();

const soundSources: Record<RecordedGameSound, string> = {
  correct: "/sounds/correct-sound.mp3",
  incorrect: "/sounds/wrong-sound.mp3",
  complete: "/sounds/finished-sound.mp3",
};

const soundVolumes: Record<RecordedGameSound, number> = {
  correct: 0.55,
  incorrect: 0.5,
  complete: 0.6,
};

function getAudioContext() {
  if (typeof window === "undefined") return null;

  audioContext ??= new AudioContext();
  return audioContext;
}

function playTone(
  context: AudioContext,
  frequency: number,
  offset: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  endFrequency = frequency
) {
  const start = context.currentTime + offset;
  const end = start + duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.01, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

function getRecordedSound(sound: RecordedGameSound) {
  let player = audioPlayers.get(sound);

  if (!player) {
    player = new Audio(soundSources[sound]);
    player.preload = "auto";
    player.volume = soundVolumes[sound];
    audioPlayers.set(sound, player);
  }

  return player;
}

function playRecordedSound(sound: RecordedGameSound) {
  const player = getRecordedSound(sound);

  player.pause();
  player.currentTime = 0;
  void player.play().catch(() => undefined);
}

export function preloadGameSounds() {
  (Object.keys(soundSources) as RecordedGameSound[]).forEach((sound) => {
    getRecordedSound(sound).load();
  });
}

export function playGameSound(sound: GameSound) {
  if (sound !== "type") {
    playRecordedSound(sound);
    return;
  }

  const now = performance.now();

  if (now - lastTypingSoundAt < 35) return;
  lastTypingSoundAt = now;

  const context = getAudioContext();
  if (!context) return;

  void context
    .resume()
    .then(() => playTone(context, 620, 0, 0.035, 0.018, "triangle", 520))
    .catch(() => undefined);
}
