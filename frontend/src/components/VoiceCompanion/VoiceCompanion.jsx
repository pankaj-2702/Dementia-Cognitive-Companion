import React, { useState, useEffect, useRef } from 'react';
import { VoiceButton } from './VoiceButton';
import { VoiceStatus } from './VoiceStatus';
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  stopSpeechRecognition,
  abortSpeechRecognition
} from '../../services/speechRecognition';
import {
  isSpeechSynthesisSupported,
  stopSpeech
} from '../../services/speechSynthesis';

export function VoiceCompanion({
  language = 'en-IN',
  inputText = '',
  onTranscriptChange = () => {},
  onListeningChange = () => {},
  onSendMessage = () => {},
  isProcessing = false,
  isSpeaking = false,
  onStopSpeaking
}) {
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [isHearingVoice, setIsHearingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const transcriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const isSendingRef = useRef(false);
  const recognitionRef = useRef(null);

  const speechSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      stopSpeech();
    };
  }, []);

  // Sync voice state with parent processing or speaking state
  useEffect(() => {
    if (isProcessing) {
      setVoiceState('processing');
      onListeningChange(false);
    } else if (isSpeaking) {
      setVoiceState('speaking');
      onListeningChange(false);
    } else if (voiceState !== 'listening') {
      setVoiceState('idle');
      onListeningChange(false);
    }
  }, [isProcessing, isSpeaking]);

  const handleFinishAndSend = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const textToSend = (transcriptRef.current || inputText || '').trim();
    if (!textToSend) {
      stopSpeechRecognition();
      setVoiceState('idle');
      setIsHearingVoice(false);
      onListeningChange(false);
      return;
    }

    isSendingRef.current = true;
    stopSpeechRecognition();
    transcriptRef.current = '';
    setIsHearingVoice(false);
    setVoiceState('processing');
    onListeningChange(false);

    onSendMessage(textToSend);
  };

  const handleToggleListening = () => {
    setVoiceError('');

    // If currently speaking, stop speech
    if (voiceState === 'speaking' || isSpeaking) {
      stopSpeech();
      if (onStopSpeaking) onStopSpeaking();
      setVoiceState('idle');
      onListeningChange(false);
      return;
    }

    // If currently listening, tapping the button immediately stops and sends the captured speech
    if (voiceState === 'listening') {
      handleFinishAndSend();
      return;
    }

    if (!speechSupported) {
      setVoiceError(
        language.startsWith('hi')
          ? 'इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया नीचे लिखकर संदेश भेजें।'
          : 'Speech recognition is not supported in this browser. Please type below.'
      );
      return;
    }

    transcriptRef.current = '';
    isSendingRef.current = false;
    setIsHearingVoice(false);
    setVoiceState('listening');
    onListeningChange(true);

    recognitionRef.current = startSpeechRecognition({
      lang: language,
      onStart: () => {
        setVoiceState('listening');
        setVoiceError('');
        onListeningChange(true);
      },
      onSpeechStart: () => {
        setIsHearingVoice(true);
      },
      onResult: ({ transcript, final, interim }) => {
        const text = transcript || final || interim;
        if (!text) return;

        setIsHearingVoice(true);
        transcriptRef.current = text;

        // Dynamically update the on-screen input field so user sees words typed in real time
        onTranscriptChange(text);

        // Reset auto-send silence timer: automatically sends after 2.0s of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleFinishAndSend();
        }, 2000);
      },
      onError: (err) => {
        console.warn('[VoiceCompanion] Recognition error:', err);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const errType = err?.error || err?.message || '';

        if (errType === 'not-allowed') {
          setVoiceError(
            language.startsWith('hi')
              ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत है। कृपया ब्राउज़र एड्रेस बार में अनुमति दें।'
              : 'Microphone permission denied. Please allow mic in browser address bar.'
          );
        } else if (errType === 'network') {
          setVoiceError(
            language.startsWith('hi')
              ? 'नेटवर्क समस्या के कारण आवाज़ नहीं पहुँच सकी। कृपया नीचे टाइप करें।'
              : 'Speech network error in this browser. Please type your message below.'
          );
        } else if (errType === 'audio-capture') {
          setVoiceError(
            language.startsWith('hi')
              ? 'कोई माइक्रोफ़ोन नहीं मिला। कृपया माइक जोड़ें या नीचे लिखें।'
              : 'No microphone detected on this device. Please type below.'
          );
        } else if (errType === 'no-speech') {
          // If no transcript was captured yet, inform user
          if (!transcriptRef.current) {
            setVoiceError(
              language.startsWith('hi')
                ? 'कोई आवाज़ सुनाई नहीं दी। माइक दबाकर साफ़ आवाज़ में बोलें।'
                : 'No voice detected. Please tap mic and speak clearly.'
            );
          }
        } else {
          setVoiceError(
            language.startsWith('hi')
              ? 'आवाज़ रिकॉर्ड करने में समस्या हुई। कृपया पुनः प्रयास करें।'
              : 'Could not capture voice. Tap mic to retry or type below.'
          );
        }

        setIsHearingVoice(false);
        setVoiceState('idle');
        onListeningChange(false);
      },
      onEnd: () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // If we are actively sending, do not reset voiceState to idle
        if (isSendingRef.current) {
          isSendingRef.current = false;
          return;
        }

        // If there is any remaining transcript that wasn't sent yet, send it
        const latest = transcriptRef.current.trim();
        if (latest) {
          handleFinishAndSend();
        } else {
          setVoiceState('idle');
          setIsHearingVoice(false);
          onListeningChange(false);
        }
      }
    });
  };

  return (
    <div className="voice-companion-panel">
      <VoiceStatus
        state={voiceState}
        isHearing={isHearingVoice}
        error={voiceError}
        language={language}
      />

      <div className="voice-center-control">
        <VoiceButton
          isListening={voiceState === 'listening'}
          isProcessing={voiceState === 'processing'}
          isDisabled={!speechSupported}
          onClick={handleToggleListening}
        />
      </div>
    </div>
  );
}

export default VoiceCompanion;
