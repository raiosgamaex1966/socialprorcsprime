import { useCallback, useRef } from "react";

type SoundType = "message" | "notification" | "reaction" | "memory";

const SOUNDS: Record<SoundType, { freqs: number[]; duration: number; gain: number }> = {
  message: { freqs: [830, 1050], duration: 0.25, gain: 0.15 },
  notification: { freqs: [660, 880], duration: 0.35, gain: 0.12 },
  reaction: { freqs: [1200, 1400], duration: 0.15, gain: 0.1 },
  memory: { freqs: [523, 659, 784, 1047], duration: 0.6, gain: 0.14 },
};

const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(() => {
    const saved = localStorage.getItem("notification-sounds");
    return saved !== "false";
  });

  const play = useCallback((type: SoundType = "message") => {
    if (!enabledRef.current()) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const config = SOUNDS[type];
      const now = ctx.currentTime;

      if (type === "memory") {
        // Play a gentle ascending arpeggio for memories
        config.freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g);
          g.connect(ctx.destination);
          osc.type = "sine";
          const startTime = now + i * 0.12;
          osc.frequency.setValueAtTime(freq, startTime);
          g.gain.setValueAtTime(config.gain, startTime);
          g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(config.freqs[0], now);
        osc.frequency.setValueAtTime(config.freqs[1], now + config.duration * 0.3);
        gain.gain.setValueAtTime(config.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
        osc.start(now);
        osc.stop(now + config.duration);
      }
    } catch {
      // Audio not available
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem("notification-sounds", String(enabled));
  }, []);

  const isEnabled = useCallback(() => {
    const saved = localStorage.getItem("notification-sounds");
    return saved !== "false";
  }, []);

  return { playNotification: play, setEnabled, isEnabled };
};

export default useNotificationSound;
