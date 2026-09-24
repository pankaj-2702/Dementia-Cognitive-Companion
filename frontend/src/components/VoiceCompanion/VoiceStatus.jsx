import React from 'react';
import { Volume2, Mic, Sparkles, AlertCircle } from 'lucide-react';

export function VoiceStatus({ state = 'idle', isHearing = false, error = '', language = 'en-IN' }) {
  const isHindi = language.startsWith('hi');

  const getStatusContent = () => {
    if (error) {
      return {
        icon: <AlertCircle size={15} color="#DC2626" />,
        text: error,
        className: 'status-error'
      };
    }

    switch (state) {
      case 'listening':
        if (isHearing) {
          return {
            icon: <Mic size={15} className="animate-bounce" color="#16A34A" />,
            text: isHindi
              ? 'आपकी बात सुन रहे हैं... स्क्रीन पर टाइप हो रहा है'
              : 'Hearing your voice... typing onto screen',
            className: 'status-listening active-speech'
          };
        }
        return {
          icon: <Mic size={15} className="animate-pulse" color="#16A34A" />,
          text: isHindi
            ? 'सुन रहे हैं... कृपया बोलें (रुकने पर अपने-आप भेजा जाएगा)'
            : 'Listening... speak now (sends when you pause)',
          className: 'status-listening'
        };
      case 'processing':
        return {
          icon: <Sparkles size={15} className="animate-spin" color="#D97706" />,
          text: isHindi ? 'स्मृति साथी सोच रहे हैं...' : 'Thinking of a comforting reply...',
          className: 'status-processing'
        };
      case 'speaking':
        return {
          icon: <Volume2 size={15} className="animate-bounce" color="#0D9488" />,
          text: isHindi ? 'उत्तर बोलकर सुना रहे हैं...' : 'Speaking reply aloud...',
          className: 'status-speaking'
        };
      case 'idle':
      default:
        return {
          icon: <Mic size={15} color="#64748B" />,
          text: isHindi ? 'माइक दबाकर बोलें या नीचे संदेश लिखें' : 'Tap mic to speak or type message below',
          className: 'status-idle'
        };
    }
  };

  const { icon, text, className } = getStatusContent();

  return (
    <div className={`voice-status-pill ${className}`}>
      <span className="voice-status-icon">{icon}</span>
      <span className="voice-status-text">{text}</span>
    </div>
  );
}

export default VoiceStatus;
