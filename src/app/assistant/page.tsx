'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BotMessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Sliders,
  Loader2,
  Check,
  Compass,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import {
  getAssistantChatHistory,
  saveAssistantChatHistory,
  clearAssistantChatHistory,
} from '@/lib/firestore-service';
import { AssistantMessage } from '@/types';
import { generateId } from '@/lib/utils';

export default function AssistantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const { play: playGlobalAudio } = useAudioPlayer();

  const uid = user ? user.uid : 'guest';

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Speech Recognition (Mic Input)
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);

  // Voice Output (Rime TTS)
  const [voiceSynthesisEnabled, setVoiceSynthesisEnabled] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState('astra');
  const [isSpeakingAudio, setIsSpeakingAudio] = useState<string | null>(null); // messageId currently playing
  const audioVoiceRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const history = getAssistantChatHistory(uid);
    if (history.length > 0) {
      setMessages(history);
    } else {
      setMessages([
        {
          id: generateId('msg'),
          role: 'assistant',
          content:
            "Hello! I am Sonic Assistant, your AI music copilot. I can help you craft rich prompts for the ElevenLabs Music API, design sound effects, arrange compositions, and guide your studio workflow.\n\nTry asking: 'Write a synthwave prompt with 80s analog synthesizers' or 'How do I generate a cinematic impact?'",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup Web Speech API for voice input
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRecognition as any)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript;
          }
          setInputText(fullTranscript);
        };

        recognition.onerror = (e: { error: string }) => {
          console.warn('Speech recognition error:', e.error);
          setIsListening(false);
          if (e.error === 'not-allowed') {
            setMicError('Microphone permission was denied.');
          } else {
            setMicError(`Voice recognition: ${e.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      warning(
        'Speech Recognition Unavailable',
        'Your browser does not support Web Speech API. Please type your prompt in the box below.'
      );
      return;
    }

    setMicError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = recognitionRef.current as any;

    if (isListening) {
      recog.stop();
      setIsListening(false);
    } else {
      try {
        recog.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
        setIsListening(false);
      }
    }
  };

  // Synthesize voice via Rime TTS
  const speakWithRime = async (text: string, messageId: string) => {
    try {
      setIsSpeakingAudio(messageId);
      // Clean markdown tags for natural speech synthesis
      const speechText = text
        .replace(/[*_#`[\]()]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
        .substring(0, 300);

      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: speechText,
          speaker: selectedSpeaker,
          lang: 'en',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Voice synthesis failed');
      }

      const { audioUrl } = await res.json();
      if (audioUrl) {
        if (!audioVoiceRef.current) {
          audioVoiceRef.current = new Audio();
        }
        audioVoiceRef.current.src = audioUrl;
        audioVoiceRef.current.onended = () => setIsSpeakingAudio(null);
        audioVoiceRef.current.onerror = () => setIsSpeakingAudio(null);
        await audioVoiceRef.current.play();
      }
    } catch (e: unknown) {
      console.warn('Rime TTS playback notice:', e);
      setIsSpeakingAudio(null);
      // Fallback: Browser native SpeechSynthesis if Rime server call fails or is out of quota
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.substring(0, 200));
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputText).trim();
    if (!queryText || isSending) return;

    if (isListening && recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
      setIsListening(false);
    }

    const userMsg: AssistantMessage = {
      id: generateId('msg_user'),
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveAssistantChatHistory(uid, updated);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      const assistantMsg: AssistantMessage = {
        id: generateId('msg_ast'),
        role: 'assistant',
        content: data.reply || "I'm here to assist your music workflow.",
        suggestedPrompt: data.suggestedPrompt,
        timestamp: Date.now(),
      };

      const finalMessages = [...updated, assistantMsg];
      setMessages(finalMessages);
      saveAssistantChatHistory(uid, finalMessages);

      // Auto trigger voice output if enabled
      if (voiceSynthesisEnabled) {
        speakWithRime(assistantMsg.content, assistantMsg.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Assistant error';
      error('Assistant Error', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear assistant conversation history?')) {
      clearAssistantChatHistory(uid);
      setMessages([
        {
          id: generateId('msg'),
          role: 'assistant',
          content: 'Conversation history cleared. How can I assist with your music today?',
          timestamp: Date.now(),
        },
      ]);
      success('History Cleared', 'Assistant memory reset');
    }
  };

  const handleLoadPromptToStudio = (promptText: string) => {
    sessionStorage.setItem('sonicforge_temp_prompt', promptText);
    router.push('/studio');
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5">
              <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
                <BotMessageSquare className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Sonic Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-studio-violet/20 border border-studio-violet/30 text-studio-violet font-semibold">
                  Rime Voice Enabled
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Music prompting, arrangements, foley advice &amp; troubleshooting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice toggle */}
            <button
              onClick={() => setVoiceSynthesisEnabled(!voiceSynthesisEnabled)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                voiceSynthesisEnabled
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title={voiceSynthesisEnabled ? 'Voice output ON (Rime TTS)' : 'Voice output OFF'}
            >
              {voiceSynthesisEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Voice TTS</span>
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-midnight-900/50 border border-studio-border/50 backdrop-blur-md">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const isSpeakingThis = isSpeakingAudio === m.id;
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-studio-blue/20 border border-studio-blue/30 flex items-center justify-center shrink-0 mt-1">
                    <BotMessageSquare className="w-4 h-4 text-cyan-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                    isUser
                      ? 'bg-gradient-to-r from-studio-blue to-studio-violet text-white rounded-tr-sm shadow-md'
                      : 'bg-midnight-850/90 border border-studio-border/80 text-slate-200 rounded-tl-sm shadow-lg'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>

                  {/* If assistant gave a suggested prompt with quick launch */}
                  {m.suggestedPrompt && (
                    <div className="mt-3 p-3 rounded-xl bg-midnight-950/70 border border-cyan-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-cyan-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Recommended Studio Prompt
                        </span>
                      </div>
                      <p className="text-slate-300 font-mono text-[11px] bg-slate-900/80 p-2 rounded border border-white/5">
                        &quot;{m.suggestedPrompt}&quot;
                      </p>
                      <button
                        onClick={() => handleLoadPromptToStudio(m.suggestedPrompt!)}
                        className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Load Prompt into Music Studio</span>
                      </button>
                    </div>
                  )}

                  {!isUser && (
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Sonic Copilot</span>
                      <button
                        onClick={() => speakWithRime(m.content, m.id)}
                        className="text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        title="Replay Voice (Rime Coda)"
                      >
                        {isSpeakingThis ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Speaking...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Play Voice</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-11 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Sonic Assistant is composing reply...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shrink-0 space-y-2">
          {micError && (
            <p className="text-[11px] text-rose-400 px-2">{micError}</p>
          )}

          {isListening && (
            <div className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Listening to your voice... Speak your musical idea.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Microphone button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input (Microphone)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Typed Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={
                isListening
                  ? 'Transcribing speech...'
                  : 'Ask about song structures, prompt engineering, instruments, or error troubleshooting...'
              }
              className="flex-1 p-3 rounded-xl bg-midnight-950/80 border border-studio-border text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue focus:ring-1 focus:ring-studio-blue"
            />

            {/* Send button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputText.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white hover:opacity-95 disabled:opacity-40 transition-all shadow-md shadow-studio-blue/20"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

