'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  LifeBuoy,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  createSupportTicket,
  getUserSupportTickets,
} from '@/lib/firestore-service';
import { SupportTicket } from '@/types';
import { generateId, formatDate } from '@/lib/utils';

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
}

const KNOWLEDGE_BASE: HelpArticle[] = [
  {
    id: 'kb-elevenlabs-credits',
    category: 'Billing & Quotas',
    title: 'Resolving ElevenLabs 429 & Insufficient Credits Errors',
    summary:
      'Understand why generations return HTTP 429 and how ElevenLabs character allowances work.',
    content:
      'ElevenLabs Music and Sound Effects generation use character quotas and concurrent processing limits. If you receive a 429 Rate Limit error, the server has hit the concurrency limit or your monthly account character budget is temporarily exhausted. To resolve this, wait 60 seconds before submitting another request or upgrade your tier in the ElevenLabs Console.',
  },
  {
    id: 'kb-browser-audio',
    category: 'Audio Playback',
    title: 'Audio Won’t Play Automatically in Chrome or Safari',
    summary:
      'Modern web browsers block unmuted autoplay without an explicit user gesture.',
    content:
      'Due to strict Autoplay Policies in Google Chrome, Safari, and Edge, web applications cannot automatically start audio with sound unless the user has interacted with the page. SonicForge AI respects this policy by requiring a click on the Play button to activate the AudioContext.',
  },
  {
    id: 'kb-waveform-visualization',
    category: 'Technical Architecture',
    title: 'How SonicForge Real Waveforms are Calculated',
    summary:
      'SonicForge never paints fake animated waveforms. Here is how Web Audio API renders real peaks.',
    content:
      'When audio is loaded, the client uses the native Web Audio API (AudioContext.decodeAudioData) to decode the binary audio stream into raw PCM Float32 samples. It groups the channel samples into 48 discrete time windows, calculates root-mean-square amplitude, and renders actual physical audio peaks onto the waveform visualizer.',
  },
  {
    id: 'kb-rime-tts',
    category: 'Integrations',
    title: 'Rime Coda Voice Synthesis Configuration',
    summary: 'How Rime Coda streams speech and handles speaker parameters.',
    content:
      'Sonic Assistant voice playback routes requests to coda.api.rime.ai using the authenticated RIME_TTS_API_KEY. Supported speakers include "astra", "nadi", and "marcus". If the API key is not configured, the assistant automatically falls back to browser-native speech synthesis and clear on-screen text.',
  },
  {
    id: 'kb-firebase-security',
    category: 'Security & Auth',
    title: 'User Data Ownership & Security Rules',
    summary:
      'How private projects and tracks are safeguarded in Cloud Firestore.',
    content:
      'Each project, track, and support ticket is tied to the authenticated user ID. In Firestore Security Rules, read and write operations are strictly allowed only when request.auth.uid == resource.data.userId, ensuring zero cross-tenant leakage.',
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const uid = user ? user.uid : 'guest';
  const userEmail = user?.email || 'guest@sonicforge.ai';

  // Help Search & Accordion
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKbId, setExpandedKbId] = useState<string | null>('kb-elevenlabs-credits');

  // Support Form State
  const [category, setCategory] = useState<SupportTicket['category']>('generation_issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets List
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    getUserSupportTickets(uid).then(setTickets);
  }, [uid]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      warning('Form incomplete', 'Subject and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newTicket: SupportTicket = {
        id: generateId('ticket'),
        userId: uid,
        userEmail,
        subject: subject.trim(),
        category,
        description: description.trim(),
        errorDetails: errorDetails.trim() || undefined,
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createSupportTicket(newTicket);
      setTickets((prev) => [newTicket, ...prev]);
      setSubject('');
      setDescription('');
      setErrorDetails('');
      success('Ticket Submitted', 'Our engineering team has received your inquiry.');
    } catch (err: unknown) {
      error('Submission Error', err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEmailClient = () => {
    const supportEmail = 'support@sonicforge.ai';
    const emailSubject = encodeURIComponent('SonicForge AI Support Request');
    const emailBody = encodeURIComponent(
      `Hello SonicForge AI Team,\n\nI need technical assistance with my studio session.\n\nUser ID: ${uid}\nAccount Email: ${userEmail}\nCategory: ${category}\n\nIssue Description:\n${description || '[Describe your issue here]'}\n\nTechnical Error Details:\n${errorDetails || 'N/A'}\n\nBrowser: ${navigator.userAgent}`
    );
    window.location.href = `mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`;
    success('Email Client Opened', 'Check your mail application to send your message.');
  };

  const filteredKb = KNOWLEDGE_BASE.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-midnight-900 via-midnight-850 to-midnight-900 border border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 border border-studio-blue/20 text-cyan-300 text-xs font-semibold mb-3">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>VeraCost-Inspired Customer Care</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Help Center &amp; Engineering Support
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Find instant answers to audio generation and API questions, or open a direct ticket
              with our engineering team.
            </p>
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-studio-blue" />
              Knowledge Base &amp; Troubleshooting
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search troubleshooting articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-midnight-900/80 border border-studio-border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredKb.map((art) => {
              const isExpanded = expandedKbId === art.id;
              return (
                <div
                  key={art.id}
                  className="rounded-2xl bg-midnight-900/70 border border-studio-border/60 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedKbId(isExpanded ? null : art.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                        {art.category}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100 mt-0.5">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{art.summary}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-white/5 bg-midnight-950/40">
                      <p className="whitespace-pre-line mt-3">{art.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Ticket Submission & Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Support Ticket Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
                Submit a Support Ticket
              </h3>

              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as SupportTicket['category'])
                      }
                      className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
                    >
                      <option value="generation_issue">AI Generation Failure</option>
                      <option value="audio_playback">Audio Playback & Waveform</option>
                      <option value="billing_quota">Quota & Character Limits</option>
                      <option value="api_integration">API & Credentials</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="general">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Generation timeout on 60s track"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what occurred, your input prompt, and what behavior you expected..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Error Log or Status Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HTTP 429: rate_limit_exceeded"
                    value={errorDetails}
                    onChange={(e) => setErrorDetails(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 font-mono focus:outline-none focus:border-studio-blue"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenEmailClient}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Send Support Email</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* User's Ticket History */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-studio-violet" />
                  Your Support Tickets
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {tickets.length} total
                </span>
              </div>

              {tickets.length === 0 ? (
                <div className="p-6 rounded-xl bg-midnight-950/50 border border-white/5 text-center text-xs text-slate-400">
                  You have not submitted any support tickets yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-midnight-950/70 border border-studio-border/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 truncate">
                          {t.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-2">
                        {t.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span>{t.category.replace('_', ' ')}</span>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

