// Kitchen chime generator using Web Audio API
let audioCtx: AudioContext | null = null;

export function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Friendly 2-tone restaurant service bell: C6 (1046.5Hz) then E6 (1318.5Hz)
    const tones = [
      { freq: 1046.5, start: now, duration: 0.3 },
      { freq: 1318.5, start: now + 0.15, duration: 0.6 },
      { freq: 1567.98, start: now + 0.35, duration: 0.8 }, // G6 bell harmonic
    ];

    tones.forEach(({ freq, start, duration }) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  } catch (err) {
    console.warn('Audio play error (user interaction might be needed):', err);
  }
}
