/**
 * SmritiRoots Speech Recognition Service
 * Wraps browser Web Speech Recognition API with continuous listening,
 * live cumulative transcript aggregation, voice activity callbacks, and robust teardown.
 */

let recognitionInstance = null;
let isUserStopping = false;

export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
};

export const createSpeechRecognizer = () => {
  if (!isSpeechRecognitionSupported()) return null;
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognitionClass();
  // Keep microphone streaming while user speaks
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  return recognizer;
};

/**
 * Resolves optimal BCP-47 tag for Chrome desktop speech service.
 * If user selected English, aligns with browser locale (e.g. en-US / en-IN) for highest fidelity.
 */
const resolveLang = (lang) => {
  if (!lang) return 'en-US';
  if (lang.startsWith('hi')) return 'hi-IN';
  if (lang.startsWith('en')) {
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('en')) {
      return navigator.language;
    }
    return 'en-US';
  }
  return lang;
};

export const startSpeechRecognition = ({
  lang = 'en-IN',
  onStart = () => {},
  onSpeechStart = () => {},
  onResult = () => {},
  onError = () => {},
  onEnd = () => {}
}) => {
  if (!isSpeechRecognitionSupported()) {
    onError({ error: 'not-supported', message: 'Speech recognition is not supported in this browser.' });
    return null;
  }

  try {
    // If a previous instance is active, abort and strip its event handlers to prevent stale callbacks
    if (recognitionInstance) {
      try {
        recognitionInstance.onstart = null;
        recognitionInstance.onspeechstart = null;
        recognitionInstance.onresult = null;
        recognitionInstance.onerror = null;
        recognitionInstance.onend = null;
        recognitionInstance.abort();
      } catch {
        // ignore
      }
      recognitionInstance = null;
    }

    isUserStopping = false;

    recognitionInstance = createSpeechRecognizer();
    if (!recognitionInstance) {
      onError({ error: 'init-failed', message: 'Failed to initialize speech recognizer.' });
      return null;
    }

    const effectiveLang = resolveLang(lang);
    recognitionInstance.lang = effectiveLang;

    recognitionInstance.onstart = () => {
      onStart();
    };

    // Fired when Chrome hardware registers actual voice audio from the user
    recognitionInstance.onspeechstart = () => {
      onSpeechStart();
    };

    // Standard Chrome Web Speech API continuous result accumulator
    recognitionInstance.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      if (event && event.results) {
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0] || !item[0].transcript) continue;

          const chunk = item[0].transcript.trim();
          if (!chunk) continue;

          if (item.isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + chunk;
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + chunk;
          }
        }
      }

      const combined = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();

      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
        transcript: combined
      });
    };

    recognitionInstance.onerror = (event) => {
      console.warn('[SpeechRecognition] Engine error event:', event?.error, event);
      if (isUserStopping) return;

      // In continuous mode, Chrome sometimes fires 'no-speech' if user paused; forward event cleanly
      onError(event);
    };

    recognitionInstance.onend = () => {
      onEnd();
    };

    try {
      recognitionInstance.start();
    } catch (startErr) {
      if (startErr.name === 'InvalidStateError') {
        // Handle race where Chrome is still cycling previous audio stream
        setTimeout(() => {
          try {
            recognitionInstance?.start();
          } catch (retryErr) {
            console.warn('[SpeechRecognition] Retry start failed:', retryErr);
            onError({ error: 'start-failed', message: retryErr.message });
          }
        }, 60);
      } else {
        throw startErr;
      }
    }

    return recognitionInstance;
  } catch (err) {
    console.error('[SpeechRecognition] Start exception:', err);
    onError({ error: 'start-failed', message: err.message });
    return null;
  }
};

export const stopSpeechRecognition = () => {
  isUserStopping = true;
  if (recognitionInstance) {
    try {
      recognitionInstance.onstart = null;
      recognitionInstance.onspeechstart = null;
      recognitionInstance.onresult = null;
      recognitionInstance.onerror = null;
      recognitionInstance.onend = null;
      recognitionInstance.stop();
    } catch {
      // ignore
    }
    recognitionInstance = null;
  }
};

export const abortSpeechRecognition = () => {
  isUserStopping = true;
  if (recognitionInstance) {
    try {
      recognitionInstance.onstart = null;
      recognitionInstance.onspeechstart = null;
      recognitionInstance.onresult = null;
      recognitionInstance.onerror = null;
      recognitionInstance.onend = null;
      recognitionInstance.abort();
    } catch {
      // ignore
    }
    recognitionInstance = null;
  }
};
