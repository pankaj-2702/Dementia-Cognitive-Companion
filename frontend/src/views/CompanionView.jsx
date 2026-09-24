import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Bot,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Heart,
  MessageSquareHeart,
  Info
} from 'lucide-react';
import { VoiceCompanion } from '../components/VoiceCompanion/VoiceCompanion';
import { TTSControls } from '../components/VoiceCompanion/TTSControls';
import {
  speakText,
  stopSpeech,
  isSpeechSynthesisSupported
} from '../services/speechSynthesis';
import { stopSpeechRecognition } from '../services/speechRecognition';
import { api } from '../api';

const QUICK_PROMPTS = {
  'en-IN': [
    { label: 'Family members', query: 'Who is in my family?' },
    { label: 'My daily routine', query: 'What is my daily routine?' },
    { label: 'Comforting thought', query: 'Please share a comforting thought with me.' },
    { label: 'Favorite things', query: 'What are my favorite things?' }
  ],
  'en-US': [
    { label: 'Family members', query: 'Who is in my family?' },
    { label: 'My daily routine', query: 'What is my daily routine?' },
    { label: 'Comforting thought', query: 'Please share a comforting thought with me.' },
    { label: 'Favorite things', query: 'What are my favorite things?' }
  ],
  'hi-IN': [
    { label: 'मेरा परिवार', query: 'मेरे परिवार में कौन-कौन है?' },
    { label: 'मेरी दिनचर्या', query: 'मेरी दैनिक दिनचर्या क्या है?' },
    { label: 'सुकून भरी बात', query: 'कृपया मुझे एक सुकून भरी अच्छी बात बताएं।' },
    { label: 'पसंदीदा चीजें', query: 'मेरी पसंदीदा चीजें क्या हैं?' }
  ]
};

export function CompanionView({ patient, onBack }) {
  const [language, setLanguage] = useState('en-IN');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isHindi = language.startsWith('hi');
  const patientName = patient?.preferred_name || patient?.name || (isHindi ? 'साथी' : 'Friend');

  // Auto-scroll messages list to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Initial greeting message
  const getInitialGreeting = (lang) => {
    if (lang.startsWith('hi')) {
      return {
        id: 'initial-greeting',
        role: 'assistant',
        text: `नमस्ते ${patientName} जी! मैं आपकी स्मृति साथी हूँ। मैं आपके साथ बात करने और आपकी यादों को ताज़ा रखने के लिए यहाँ हूँ। आज आपका दिन कैसा चल रहा है?`,
        language: lang,
        created_at: new Date().toISOString()
      };
    }
    return {
      id: 'initial-greeting',
      role: 'assistant',
      text: `Hello ${patientName}! I am your SmritiRoots companion. I am right here with you to chat, reminisce, or keep you company today. How are you feeling?`,
      language: lang,
      created_at: new Date().toISOString()
    };
  };

  // Set greeting on initial mount or language change if no conversation has taken place
  useEffect(() => {
    if (!hasStarted) {
      setMessages([getInitialGreeting(language)]);
    }
  }, [language]);

  // Stop any active speech and recognition when leaving view
  useEffect(() => {
    return () => {
      stopSpeech();
      stopSpeechRecognition();
    };
  }, []);

  // Handle Play/Stop TTS for a specific message
  const handleSpeakMessage = (msgId, text) => {
    if (speakingMessageId === msgId) {
      stopSpeech();
      setSpeakingMessageId(null);
      return;
    }

    stopSpeech();
    setSpeakingMessageId(msgId);

    speakText({
      text,
      lang: language,
      onStart: () => setSpeakingMessageId(msgId),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null)
    });
  };

  const handleStopSpeaking = () => {
    stopSpeech();
    setSpeakingMessageId(null);
  };

  // Start fresh new conversation
  const handleResetConversation = async () => {
    stopSpeech();
    stopSpeechRecognition();
    setIsVoiceListening(false);
    setSpeakingMessageId(null);
    setConversationId(null);
    setHasStarted(false);
    setInputText('');
    setMessages([getInitialGreeting(language)]);
  };

  // Send message to backend
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setHasStarted(true);
    setInputText('');

    // Stop speaking and recognition when user sends a new message
    stopSpeech();
    stopSpeechRecognition();
    setIsVoiceListening(false);
    setSpeakingMessageId(null);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      language,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const res = await api.sendCompanionMessage({
        conversationId,
        message: text,
        language
      });

      if (res && res.status === 'success') {
        if (res.conversation_id && !conversationId) {
          setConversationId(res.conversation_id);
        }

        const assistantMsgId = `assistant-${Date.now()}`;
        const assistantMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: res.reply,
          language: res.language || language,
          created_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Auto-speak response if enabled and speech synthesis is supported
        if (autoSpeak && isSpeechSynthesisSupported()) {
          handleSpeakMessage(assistantMsgId, res.reply);
        }
      } else {
        const errorMsgId = `assistant-error-${Date.now()}`;
        const fallbackText = isHindi
          ? 'माफ़ कीजिए, मुझे आपकी बात समझने में थोड़ी परेशानी हुई। क्या आप दोबारा कह सकते हैं?'
          : 'I am so sorry, I had trouble processing that. Could you please say that again?';
        setMessages((prev) => [
          ...prev,
          {
            id: errorMsgId,
            role: 'assistant',
            text: fallbackText,
            language,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('[CompanionView] Message send error:', err);
      const fallbackText = isHindi
        ? 'मैं हमेशा आपके साथ हूँ। आपका दिन शांतिपूर्ण और सुखद रहे।'
        : 'I am right here with you. Wishing you a peaceful and comforting day.';
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
          language,
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPrompts = QUICK_PROMPTS[language] || QUICK_PROMPTS['en-IN'];

  return (
    <div className="companion-view-container animate-fade-in">
      {/* 1. Header with Back, Language Selector, and Auto-Speak Toggle */}
      <header className="companion-header">
        <div className="companion-header-left">
          <button
            type="button"
            onClick={onBack}
            className="companion-back-btn"
            aria-label="Go back to Home"
            title="Go back to Home"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="companion-header-actions">
          {/* Audio Auto-Speak Toggle */}
          <button
            type="button"
            onClick={() => {
              if (speakingMessageId) handleStopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            className={`companion-icon-btn ${autoSpeak ? 'active' : ''}`}
            title={autoSpeak ? 'Voice output active' : 'Voice output muted'}
            aria-label={autoSpeak ? 'Mute voice responses' : 'Enable voice responses'}
          >
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* New Chat Session Button */}
          <button
            type="button"
            onClick={handleResetConversation}
            className="companion-icon-btn"
            title="Start new conversation"
            aria-label="Start new conversation"
          >
            <RotateCcw size={17} />
          </button>

          {/* Language Selector Dropdown */}
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              stopSpeech();
              stopSpeechRecognition();
              setIsVoiceListening(false);
              setSpeakingMessageId(null);
            }}
            className="companion-lang-select"
            aria-label="Select Companion Language"
          >
            <option value="en-IN">English (India)</option>
            <option value="en-US">English (US)</option>
            <option value="hi-IN">हिंदी (Hindi)</option>
          </select>
        </div>
      </header>

      {/* 2. Messages Scroll Area */}
      <main className="companion-messages-list">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`companion-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}
            >
              {!isUser && (
                <div className="companion-bubble-avatar">
                  <Bot size={18} />
                </div>
              )}

              <div className={`companion-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
                <p className="bubble-text">{msg.text}</p>

                {/* Assistant Audio Action Controls */}
                {!isUser && (
                  <div className="bubble-footer">
                    <TTSControls
                      isSpeaking={isSpeaking}
                      onSpeak={() => handleSpeakMessage(msg.id, msg.text)}
                      onStop={handleStopSpeaking}
                      onRepeat={() => handleSpeakMessage(msg.id, msg.text)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isProcessing && (
          <div className="companion-bubble-row assistant-row">
            <div className="companion-bubble-avatar">
              <Bot size={18} />
            </div>
            <div className="companion-bubble bubble-assistant bubble-thinking">
              <span className="thinking-dot dot-1" />
              <span className="thinking-dot dot-2" />
              <span className="thinking-dot dot-3" />
              <span className="thinking-label">
                {isHindi ? 'स्मृति साथी सोच रहे हैं...' : 'Smriti is thinking...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. Quick Suggestions Carousel */}
      <div className="companion-quick-prompts">
        {currentPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isProcessing}
            onClick={() => handleSendMessage(p.query)}
            className="prompt-chip"
          >
            <Sparkles size={13} className="prompt-chip-icon" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Bottom Controls: Voice & Live Text Input */}
      <footer className="companion-footer">
        {/* Voice Controller Component */}
        <VoiceCompanion
          language={language}
          inputText={inputText}
          onTranscriptChange={(text) => setInputText(text)}
          onListeningChange={(listening) => setIsVoiceListening(listening)}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          isSpeaking={speakingMessageId !== null}
          onStopSpeaking={handleStopSpeaking}
        />

        {/* Live Speech Typing Banner when Microphone is Listening */}
        {isVoiceListening && (
          <div className="voice-listening-banner animate-fade-in">
            <div className="voice-wave-animation">
              <span className="wave-bar bar-1" />
              <span className="wave-bar bar-2" />
              <span className="wave-bar bar-3" />
              <span className="wave-bar bar-4" />
              <span className="wave-bar bar-5" />
            </div>
            <span className="voice-listening-text">
              {inputText.trim()
                ? (isHindi
                    ? 'आपकी आवाज़ स्क्रीन पर टाइप हो रही है... रुकने पर स्वतः भेजा जाएगा'
                    : 'Typing what you speak onto screen... will auto-send when you pause')
                : (isHindi
                    ? 'माइक सक्रिय है... कृपया बोलें, शब्द यहाँ टाइप होंगे...'
                    : 'Microphone active... please speak now, words type live below...')}
            </span>
            {inputText.trim() && (
              <button
                type="button"
                className="voice-instant-send-btn"
                onClick={() => handleSendMessage(inputText)}
                title={isHindi ? 'अभी भेजें' : 'Send now'}
              >
                {isHindi ? 'तुरंत भेजें ➔' : 'Send Now ➔'}
              </button>
            )}
          </div>
        )}

        {/* Real-time Text Input Bar */}
        <form
          className="companion-text-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
            placeholder={
              isVoiceListening
                ? (isHindi ? '🎙️ सुन रहे हैं... जो आप बोलेंगे यहाँ टाइप होगा...' : '🎙️ Listening... what you speak is typing here...')
                : (isHindi ? 'माइक से बोलें या यहाँ संदेश लिखें...' : 'Speak with mic or type a message...')
            }
            className={`companion-text-input ${isVoiceListening ? 'listening-active' : ''}`}
            aria-label="Companion message input"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="companion-send-btn"
            aria-label="Send message"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default CompanionView;
