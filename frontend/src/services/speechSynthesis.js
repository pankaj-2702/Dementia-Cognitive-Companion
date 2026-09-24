/**
 * SmritiRoots Speech Synthesis (TTS) Service
 * Dual-engine architecture:
 * 1. Native HTML5 SpeechSynthesis with Chromium bug fixes (unpause, GC retain, delay)
 * 2. High-Fidelity Audio Stream Fallback (for Linux/browsers without local speech-dispatcher)
 */

let activeUtterance = null;
let activeAudio = null;
let speechWatchdogTimer = null;
let cachedVoices = [];

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Eagerly populate voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices() || [];
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          cachedVoices = window.speechSynthesis.getVoices() || [];
        } catch {
          // ignore
        }
      };
    }
  } catch {
    // ignore
  }
}

export const getAvailableVoices = () => {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    const current = window.speechSynthesis.getVoices();
    if (current && current.length > 0) {
      cachedVoices = current;
    }
  } catch {
    // ignore
  }
  return cachedVoices;
};

export const findBestVoice = (lang = 'en-IN') => {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  const targetLang = lang.toLowerCase().replace('_', '-');
  const primaryLangCode = targetLang.split('-')[0];

  // 1. Exact match (e.g. 'hi-in' or 'en-in')
  const exact = voices.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-') === targetLang);
  if (exact) return exact;

  // 2. Indian English voice
  if (targetLang.includes('in') && primaryLangCode === 'en') {
    const indianVoice = voices.find((v) =>
      v.lang && (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'))
    );
    if (indianVoice) return indianVoice;
  }

  // 3. Primary language code match (e.g. any 'hi' for Hindi or any 'en' for English)
  const codeMatch = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(primaryLangCode));
  if (codeMatch) return codeMatch;

  // 4. Default voice
  return voices.find((v) => v.default) || voices[0] || null;
};

export const stopSpeech = () => {
  if (speechWatchdogTimer) {
    clearTimeout(speechWatchdogTimer);
    speechWatchdogTimer = null;
  }

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }

  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  activeUtterance = null;
};

/**
 * Fallback audio stream player using Google TTS CDN.
 * Works seamlessly on all OS platforms, including Linux environments without speech-dispatcher.
 */
export const playAudioTTS = ({
  text,
  lang = 'en-IN',
  onStart = () => {},
  onEnd = () => {},
  onError = () => {}
}) => {
  try {
    stopSpeech();

    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    if (!cleanText) {
      onEnd();
      return null;
    }

    const langCode = lang.startsWith('hi') ? 'hi' : 'en-IN';
    // Use first 200 characters for high fidelity audio playback
    const chunk = cleanText.length > 200 ? cleanText.slice(0, 200) : cleanText;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunk)}`;

    const audio = new Audio(url);
    activeAudio = audio;

    audio.onplay = () => {
      onStart();
    };

    audio.onended = () => {
      activeAudio = null;
      onEnd();
    };

    audio.onerror = (e) => {
      console.warn('[AudioTTS] Audio element error:', e);
      activeAudio = null;
      onError(e);
      onEnd();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[AudioTTS] Play promise rejected:', err);
        activeAudio = null;
        onError(err);
        onEnd();
      });
    }

    return audio;
  } catch (err) {
    console.error('[AudioTTS] Setup error:', err);
    onError(err);
    onEnd();
    return null;
  }
};

/**
 * Main TTS entry point
 * Uses native SpeechSynthesis when available and working;
 * Automatically fails over to playAudioTTS if speech-dispatcher is missing or errors occur.
 */
export const speakText = ({
  text,
  lang = 'en-IN',
  rate = 0.95,
  pitch = 1.0,
  onStart = () => {},
  onEnd = () => {},
  onError = () => {}
}) => {
  if (!text) {
    onEnd();
    return null;
  }

  const voices = getAvailableVoices();
  const hasVoices = voices && voices.length > 0;

  // On Linux without speech-dispatcher, getVoices() is empty. Fallback immediately to audio stream.
  if (!isSpeechSynthesisSupported() || !hasVoices) {
    console.log('[SpeechSynthesis] No OS/browser voices available; using audio stream player.');
    return playAudioTTS({ text, lang, onStart, onEnd, onError });
  }

  try {
    // 1. Cancel previous speech
    window.speechSynthesis.cancel();

    // 2. Build utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const matchedVoice = findBestVoice(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = lang.startsWith('hi') ? 'hi-IN' : 'en-US';
    }

    let started = false;

    utterance.onstart = () => {
      started = true;
      if (speechWatchdogTimer) {
        clearTimeout(speechWatchdogTimer);
        speechWatchdogTimer = null;
      }
      onStart();
    };

    utterance.onend = () => {
      if (speechWatchdogTimer) {
        clearTimeout(speechWatchdogTimer);
        speechWatchdogTimer = null;
      }
      activeUtterance = null;
      onEnd();
    };

    utterance.onerror = (event) => {
      console.warn('[SpeechSynthesis] Utterance error event:', event?.error);
      if (speechWatchdogTimer) {
        clearTimeout(speechWatchdogTimer);
        speechWatchdogTimer = null;
      }
      activeUtterance = null;

      // If user tapped stop deliberately, don't fall back
      if (event?.error === 'interrupted' || event?.error === 'canceled') {
        onEnd();
        return;
      }

      // If SpeechSynthesis failed (e.g. Linux engine crash), fallback to Audio TTS
      console.log('[SpeechSynthesis] Falling back to Audio TTS due to engine error.');
      playAudioTTS({ text, lang, onStart, onEnd, onError });
    };

    // Keep active reference to prevent V8 garbage collection
    activeUtterance = utterance;

    // Watchdog timer: If SpeechSynthesis does not fire onstart within 750ms, switch to Audio TTS
    speechWatchdogTimer = setTimeout(() => {
      if (!started) {
        console.warn('[SpeechSynthesis] Watchdog timeout: Speech did not start in 750ms. Activating audio fallback.');
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        activeUtterance = null;
        playAudioTTS({ text, lang, onStart, onEnd, onError });
      }
    }, 750);

    // 40ms timeout prevents cancel-speak queue collision in Chromium
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 40);

    return utterance;
  } catch (err) {
    console.error('[SpeechSynthesis] Initialization error; falling back:', err);
    return playAudioTTS({ text, lang, onStart, onEnd, onError });
  }
};

export const pauseSpeech = () => {
  if (activeAudio) {
    activeAudio.pause();
  } else if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
};

export const resumeSpeech = () => {
  if (activeAudio) {
    activeAudio.play().catch(() => {});
  } else if (isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};
