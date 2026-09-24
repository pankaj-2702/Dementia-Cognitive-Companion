import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

export function VoiceButton({
  isListening = false,
  isProcessing = false,
  isDisabled = false,
  onClick
}) {
  return (
    <div className="voice-btn-container">
      {isListening && <div className="voice-ripple-pulse" />}
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled || isProcessing}
        className={`voice-mic-btn ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
        aria-label={isListening ? 'Stop listening' : 'Start speaking'}
        title={isListening ? 'Tap to stop listening' : 'Tap to speak'}
      >
        {isProcessing ? (
          <Loader2 className="voice-btn-icon animate-spin" size={28} />
        ) : isListening ? (
          <MicOff className="voice-btn-icon" size={28} />
        ) : (
          <Mic className="voice-btn-icon" size={28} />
        )}
      </button>
    </div>
  );
}
