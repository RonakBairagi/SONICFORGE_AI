export type CreationMode = 'full_song' | 'instrumental' | 'structured';

export interface SongStructureChunk {
  section: string; // e.g. '[Intro]', '[Verse 1]', '[Chorus]', '[Bridge]', '[Outro]'
  lyrics?: string;
  style?: string;
  durationMs?: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  lastLoginAt: number;
  providerId?: string;
  preferences?: {
    theme?: 'dark' | 'light';
    autoPlayPreview?: boolean;
    defaultDurationSec?: number;
    preferredVoice?: string;
  };
}

export interface GeneratedTrack {
  id: string;
  userId: string;
  title: string;
  description?: string;
  prompt: string;
  genre: string;
  mood: string;
  creationMode?: CreationMode;
  lyrics?: string;
  vocalStyle?: string;
  vocalGender?: string;
  language?: string;
  instrumentation?: string[];
  tempo?: string;
  forceInstrumental: boolean;
  durationMs: number;
  modelId: string;
  provider: 'elevenlabs';
  audioUrl: string; // Base64 data URL or audio link
  storagePath?: string;
  coverArtworkUrl?: string;
  createdAt: number;
  projectId?: string | null;
  projectName?: string | null;
  isFavorite?: boolean;
  status: 'completed' | 'processing' | 'failed';
  errorMessage?: string;
  generationTimeSeconds?: number;
  structureChunks?: SongStructureChunk[];
}

export interface GeneratedSoundEffect {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  category: string;
  durationSeconds: number;
  promptInfluence: number;
  loop: boolean;
  modelId: string;
  provider: 'elevenlabs';
  audioUrl: string;
  storagePath?: string;
  createdAt: number;
  projectId?: string | null;
  isFavorite?: boolean;
  status: 'completed' | 'processing' | 'failed';
  errorMessage?: string;
  generationTimeSeconds?: number;
}

export interface StudioProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  genre?: string;
  trackCount: number;
  sfxCount: number;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string; // Voice synthesized speech
  timestamp: number;
  suggestedPrompt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: 'generation_issue' | 'audio_playback' | 'billing_quota' | 'api_integration' | 'feature_request' | 'general';
  description: string;
  errorDetails?: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
  updatedAt: number;
}

export interface DiagnosticItem {
  service: string;
  status: 'configured' | 'verified' | 'failed' | 'not_supported' | 'missing';
  details: string;
  latencyMs?: number;
  lastChecked: number;
  tier?: string;
  error?: string;
}
