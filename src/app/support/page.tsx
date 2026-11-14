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
  Phone,
  ExternalLink,
  Sparkles,
  Zap,
  Mic2,
  Music2,
  RefreshCw,
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
import { SUPPORT_CONFIG, getEmailSupportUrls } from '@/lib/support-config';

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
}

const KNOWLEDGE_BASE: HelpArticle[] = [
  {
    id: 'kb-generation-speed',
    category: 'Generation Speed & Engine',
    title: 'Why Music Generation is Fast Now: 45s Timeout & Dual-Engine Fallback',
    summary:
      'How SonicForge eliminated 600–700s delays using timeout guards and intelligent audio streaming.',
    content:
      'Previous delays in generative music were caused by un-aborted HTTP connections when API quotas were exhausted or streaming chunks hung. SonicForge AI now implements a strict 45-second client and server AbortController safety ceiling. If ElevenLabs Music returns HTTP 402 (payment required) on free-tier keys, SonicForge seamlessly falls back to the ElevenLabs high-fidelity sound synthesis engine, returning verified audio in 2–4 seconds without blocking the UI.',
  },
  {
    id: 'kb-sfx-loading-fix',
    category: 'SFX Studio',
    title: 'Fixing SFX Infinite Loading & Audio Context Crashes',
    summary:
      'How the Sound Effects Studio guarantees zero infinite loading with a 25s safety guard.',
    content:
      'The infinite loading state was caused by browsers blocking base64 data URLs when crossOrigin="anonymous" was enabled on the HTML Audio element, combined with browser localStorage quota exhaustion. SonicForge AI fixed this by:\n1. Removing inappropriate crossOrigin attributes from local data URLs.\n2. Implementing a 25-second AbortController timeout.\n3. Trimming offline client cache to prevent QuotaExceededError.\n4. Upgrading to the latest eleven_text_to_sound_v3 model.',
  },
  {
    id: 'kb-vocal-songs',
    category: 'Vocal Studio',
    title: 'Generating Full Songs with AI-Sung Vocals and Lyrics',
    summary:
      'Learn how to write structured lyrics with section tags for realistic vocal generation.',
    content:
      'To generate full vocal songs with natural singing melodies:\n1. Switch to "Full Song with AI Vocals" mode in the AI Music Studio.\n2. Add section tags in your lyrics, such as [Verse 1], [Chorus], and [Outro].\n3. Select your desired vocal delivery (e.g. Soaring & Anthemic, Intimate & Acoustic) and vocalist tone.\n4. Use the "AI Lyric Assistant" button to instantly draft rhyming verses and memorable hooks tailored to your genre.',
  },
  {
    id: 'kb-browser-audio',
    category: 'Audio Playback',
    title: 'Audio Won’t Play Automatically in Chrome, Edge, or Safari',
    summary:
      'Modern web browsers block unmuted autoplay without an explicit user gesture.',
    content:
      'Due to strict Autoplay Policies in Google Chrome, Safari, and Edge, web applications cannot automatically start audio with sound unless the user has interacted with the page. SonicForge AI respects this policy by requiring an initial user click on the Play button to resume the Web Audio AudioContext.',
  },
  {
    id: 'kb-elevenlabs-credits',
    category: 'Billing & Quotas',
    title: 'Resolving ElevenLabs HTTP 429 & Insufficient Credits',
    summary:
      'Understand why generations return HTTP 429 and how ElevenLabs character allowances work.',
    content:
      'ElevenLabs Music and Sound Effects generation use character quotas and concurrent processing limits. If you receive an HTTP 429 Rate Limit error, wait 60 seconds before submitting another request or upgrade your tier in the ElevenLabs Console. SonicForge displays clear, actionable error toasts instead of hanging.',
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
];

export default function SupportPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const uid = user ? user.uid : 'guest';
  const userEmail = user?.email || 'guest@sonicforge.ai';

  // Help Search & Accordion
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKbId, setExpandedKbId] = useState<string | null>('kb-generation-speed');

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
      success('Ticket Submitted', 'Our engineering support team has received your ticket.');
    } catch (err: unknown) {
      error('Submission Error', err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEmailSupport = () => {
    const { gmailComposeUrl, mailtoUrl } = getEmailSupportUrls({
      category,
      affectedFeature: category === 'generation_issue' ? 'Music & Vocal Generation' : 'Sound Effects Studio',
      whatTryingToDo: subject || 'Create audio with SonicForge AI',
      whatHappened: description || 'Encountered an issue during studio session',
      errorMessage: errorDetails || 'None',
      userId: uid,
    });

    // Try opening Gmail Web direct compose URL in new tab
    const opened = window.open(gmailComposeUrl, '_blank');
    if (!opened) {
      // Fallback to mailto
      window.location.href = mailtoUrl;
    }
    success('Email Compose Opened', `Opening support inquiry to ${SUPPORT_CONFIG.supportEmail}`);
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
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-midnight-900 border border-slate-700/60 dark:border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-studio-blue/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/15 border border-studio-blue/30 text-cyan-300 text-xs font-semibold mb-3">
              <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official Technical Support &amp; Customer Care</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Customer Support &amp; Help Desk
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Find instant answers to AI audio generation questions, review troubleshooting guides, or connect directly with our engineering team via email and phone.
            </p>

            {/* Quick Contact Badges */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <a
                href={`mailto:${SUPPORT_CONFIG.supportEmail}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenEmailSupport();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-studio-blue hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-all"
              >
                <Mail className="w-4 h-4 text-cyan-300" />
                <span>{SUPPORT_CONFIG.supportEmail}</span>
              </a>

              <a
                href={`tel:${SUPPORT_CONFIG.supportPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call Us: {SUPPORT_CONFIG.supportPhoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-studio-blue dark:text-cyan-400" />
              Troubleshooting &amp; Knowledge Base
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search troubleshooting guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-studio-blue"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredKb.map((art) => {
              const isExpanded = expandedKbId === art.id;
              return (
                <div
                  key={art.id}
                  className="rounded-2xl bg-white/80 dark:bg-midnight-900/70 border border-slate-200/80 dark:border-studio-border/60 overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setExpandedKbId(isExpanded ? null : art.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-studio-blue dark:text-cyan-400 tracking-wider">
                        {art.category}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {art.summary}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="p-5 pt-0 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-midnight-950/40">
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
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-studio-blue dark:text-cyan-400" />
                Submit a Support Ticket
              </h3>

              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as SupportTicket['category'])
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue"
                    >
                      <option value="generation_issue">AI Generation Failure / Timeout</option>
                      <option value="audio_playback">Audio Playback &amp; Waveform</option>
                      <option value="billing_quota">Quota &amp; ElevenLabs Credits</option>
                      <option value="api_integration">API Keys &amp; Credentials</option>
                      <option value="feature_request">Feature Request / Enhancement</option>
                      <option value="general">General Inquiries</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Generation timeout on vocal song"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what occurred, your input prompt, and what behavior you expected..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Error Log or Status Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HTTP 429: rate_limit_exceeded or abort_error"
                    value={errorDetails}
                    onChange={(e) => setErrorDetails(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-studio-blue"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenEmailSupport}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-studio-blue dark:text-cyan-400" />
                    <span>Open Email Draft ({SUPPORT_CONFIG.supportEmail})</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-bold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* User's Ticket History & Direct Support Contacts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-studio-violet" />
                  Your Support Tickets
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {tickets.length} total
                </span>
              </div>

              {tickets.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-midnight-950/50 border border-slate-100 dark:border-white/5 text-center text-xs text-slate-500 dark:text-slate-400">
                  You have not submitted any support tickets yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-950/70 border border-slate-200 dark:border-studio-border/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                          {t.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">
                        {t.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-white/5">
                        <span>{t.category.replace('_', ' ')}</span>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Direct Support Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Direct Developer Hotline
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  For urgent hackathon issues or judge demonstrations, contact the lead developer directly:
                </p>
                <div className="flex flex-col gap-1 pt-1 text-xs font-medium">
                  <a
                    href={`tel:${SUPPORT_CONFIG.supportPhone}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono font-bold flex items-center gap-1.5"
                  >
                    <span>📞 {SUPPORT_CONFIG.supportPhoneDisplay}</span>
                  </a>
                  <a
                    href={`mailto:${SUPPORT_CONFIG.supportEmail}`}
                    className="text-studio-blue dark:text-cyan-400 hover:underline font-mono flex items-center gap-1.5"
                  >
                    <span>✉️ {SUPPORT_CONFIG.supportEmail}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
