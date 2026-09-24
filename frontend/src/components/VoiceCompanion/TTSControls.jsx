import React from 'react';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';

export function TTSControls({
  isSpeaking = false,
  onSpeak,
  onStop,
  onRepeat
}) {
  return (
    <div className="tts-controls-wrapper">
      {isSpeaking ? (
        <button
          type="button"
          onClick={onStop}
          className="tts-btn tts-btn-stop"
          title="Stop reading aloud"
          aria-label="Stop reading aloud"
        >
          <VolumeX size={15} />
          <span>Stop</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSpeak}
          className="tts-btn tts-btn-speak"
          title="Read aloud"
          aria-label="Read aloud"
        >
          <Volume2 size={15} />
          <span>Listen</span>
        </button>
      )}

      {onRepeat && (
        <button
          type="button"
          onClick={onRepeat}
          className="tts-btn tts-btn-repeat"
          title="Repeat message"
          aria-label="Repeat message"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
