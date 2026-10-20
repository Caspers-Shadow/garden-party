    let audioCtx = null;
    let melodyNoteIndex = 0;
    let lastNoteTime = 0;
    const MIN_NOTE_INTERVAL_MS = 175;

    const N = {
      C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
      Cs5: 554.37, Bb5: 932.33, C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
      C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98
    };

    const SCORES = {
      clair: {
        name: "Clair de Lune — Debussy",
        notes: [
          N.F5, N.Eb5, N.Db5, N.C5, N.Bb4, N.Ab4, 
          N.C5, N.Db5, N.Eb5, N.F5, N.Ab5, N.G5, N.F5, N.Eb5, N.Db5, N.C5, 
          N.Ab4, N.C5, N.Eb5, N.Ab5, N.C6, N.Bb5, N.Ab5, N.G5, N.F5, N.Eb5
        ]
      },
      ghibli: {
        name: "Meadow Breeze — Summer Waltz",
        notes: [
          N.E5, N.G5, N.A5, N.B5, N.D6, N.B5, N.A5, N.G5, 
          N.E5, N.D5, N.E5, N.G5, N.A5, N.D6, N.B5, N.A5, N.G5, N.E5
        ]
      },
      gymnopedie: {
        name: "Gymnopédie No. 1 — Satie",
        notes: [
          N.G4, N.B4, N.D5, N.Fs5, N.E5, N.D5, N.B4, N.D5, N.G4, N.A4, N.B4,
          N.Fs4, N.A4, N.D5, N.Fs5, N.E5, N.D5, N.Cs5, N.B4, N.A4, N.Fs4
        ]
      },
      canon: {
        name: "Music Box — Canon in D",
        notes: [
          N.Fs5, N.E5, N.D5, N.Cs5, N.B4, N.A4, N.B4, N.Cs5,
          N.D5, N.Fs5, N.A5, N.G5, N.Fs5, N.D5, N.E5, N.Cs5,
          N.D5, N.E5, N.Fs5, N.G5, N.A5, N.B5, N.A5, N.G5, N.Fs5
        ]
      },
      harp: {
        name: "Romantic Folk Harp",
        notes: [
          N.D4, N.F4, N.A4, N.D5, N.C5, N.A4, N.F4, N.G4,
          N.A4, N.C5, N.E5, N.G5, N.F5, N.D5, N.A4, N.D4
        ]
      }
    };

    function playMelodicPlantNote(depthRatio = 0.5) {
      const selected = state.melody;
      if (!state.soundEnabled) return;
      if (selected === 'mute') return;

      const nowMs = Date.now();
      if (nowMs - lastNoteTime < MIN_NOTE_INTERVAL_MS) {
        return;
      }
      lastNoteTime = nowMs;

      const score = SCORES[selected] || SCORES.clair;

      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const t = audioCtx.currentTime;
        const noteFreq = score.notes[melodyNoteIndex % score.notes.length];
        melodyNoteIndex++;

        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(noteFreq, t);

        const osc2 = audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(noteFreq * 2.005, t);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, t);
        filter.Q.setValueAtTime(1.8, t);

        const gain1 = audioCtx.createGain();
        const gain2 = audioCtx.createGain();

        gain1.gain.setValueAtTime(0.0001, t);
        gain1.gain.exponentialRampToValueAtTime(0.065, t + 0.025);
        gain1.gain.exponentialRampToValueAtTime(0.00001, t + 1.4);

        gain2.gain.setValueAtTime(0.0001, t);
        gain2.gain.exponentialRampToValueAtTime(0.015, t + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.00001, t + 0.7);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(audioCtx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 1.45);
        osc2.stop(t + 0.75);

        showMelodyNoteFeedback(score.name);
      } catch (e) {
        // Safe audio fallback
      }
    }

    let indicatorTimeout = null;
    function showMelodyNoteFeedback(title) {
      melodyNoteText.textContent = title;
      melodyIndicator.style.opacity = '1';
      clearTimeout(indicatorTimeout);
      indicatorTimeout = setTimeout(() => {
        melodyIndicator.style.opacity = '0';
      }, 1200);
    }

