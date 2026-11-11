import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { GeneratedTrack, GeneratedSoundEffect, StudioProject, SupportTicket, UserProfile, AssistantMessage } from '@/types';

// Browser local cache fallback keys
const CACHE_KEYS = {
  TRACKS: 'sonicforge_tracks_cache',
  SFX: 'sonicforge_sfx_cache',
  PROJECTS: 'sonicforge_projects_cache',
  TICKETS: 'sonicforge_tickets_cache',
  CHATS: 'sonicforge_chats_cache',
  USER: 'sonicforge_user_cache',
};

function getLocalCache<T>(key: string, userId: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${key}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalCache<T>(key: string, userId: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${key}_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

// -------------------------------------------------------------
// USER PROFILE
// -------------------------------------------------------------
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${CACHE_KEYS.USER}_${profile.uid}`, JSON.stringify(profile));
    } catch (_) {}
  }
  if (!firestore) return;
  try {
    const userRef = doc(firestore, 'users', profile.uid);
    await setDoc(userRef, profile, { merge: true });
  } catch (error) {
    console.warn('Firestore profile save warning (fallback to local):', error);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!firestore) {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`${CACHE_KEYS.USER}_${uid}`);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  }
  try {
    const userRef = doc(firestore, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (error) {
    console.warn('Firestore get profile warning:', error);
  }
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${CACHE_KEYS.USER}_${uid}`);
    return raw ? JSON.parse(raw) : null;
  }
  return null;
}

// -------------------------------------------------------------
// TRACKS
// -------------------------------------------------------------
export async function saveTrack(track: GeneratedTrack): Promise<void> {
  const localList = getLocalCache<GeneratedTrack>(CACHE_KEYS.TRACKS, track.userId);
  const updatedList = [track, ...localList.filter((t) => t.id !== track.id)];
  setLocalCache(CACHE_KEYS.TRACKS, track.userId, updatedList);

  if (firestore) {
    try {
      const trackRef = doc(firestore, 'tracks', track.id);
      await setDoc(trackRef, track);
    } catch (e) {
      console.warn('Firestore saveTrack fallback to local cache:', e);
    }
  }
}

export async function getUserTracks(userId: string): Promise<GeneratedTrack[]> {
  const cached = getLocalCache<GeneratedTrack>(CACHE_KEYS.TRACKS, userId);
  if (!firestore) return cached;

  try {
    const q = query(collection(firestore, 'tracks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteTracks: GeneratedTrack[] = [];
      snapshot.forEach((docSnap) => {
        remoteTracks.push(docSnap.data() as GeneratedTrack);
      });
      remoteTracks.sort((a, b) => b.createdAt - a.createdAt);
      setLocalCache(CACHE_KEYS.TRACKS, userId, remoteTracks);
      return remoteTracks;
    }
  } catch (error) {
    console.warn('Firestore getUserTracks warning, using local cache:', error);
  }
  return cached;
}

export async function deleteTrack(trackId: string, userId: string): Promise<void> {
  const localList = getLocalCache<GeneratedTrack>(CACHE_KEYS.TRACKS, userId);
  setLocalCache(CACHE_KEYS.TRACKS, userId, localList.filter((t) => t.id !== trackId));

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'tracks', trackId));
    } catch (e) {
      console.warn('Firestore deleteTrack error:', e);
    }
  }
}

export async function updateTrackMetadata(
  trackId: string,
  userId: string,
  updates: Partial<GeneratedTrack>
): Promise<void> {
  const localList = getLocalCache<GeneratedTrack>(CACHE_KEYS.TRACKS, userId);
  const updatedList = localList.map((t) => (t.id === trackId ? { ...t, ...updates } : t));
  setLocalCache(CACHE_KEYS.TRACKS, userId, updatedList);

  if (firestore) {
    try {
      await updateDoc(doc(firestore, 'tracks', trackId), updates);
    } catch (e) {
      console.warn('Firestore updateTrackMetadata error:', e);
    }
  }
}

// -------------------------------------------------------------
// SOUND EFFECTS
// -------------------------------------------------------------
export async function saveSoundEffect(sfx: GeneratedSoundEffect): Promise<void> {
  const localList = getLocalCache<GeneratedSoundEffect>(CACHE_KEYS.SFX, sfx.userId);
  const updatedList = [sfx, ...localList.filter((s) => s.id !== sfx.id)];
  setLocalCache(CACHE_KEYS.SFX, sfx.userId, updatedList);

  if (firestore) {
    try {
      const sfxRef = doc(firestore, 'sound_effects', sfx.id);
      await setDoc(sfxRef, sfx);
    } catch (e) {
      console.warn('Firestore saveSoundEffect fallback to local cache:', e);
    }
  }
}

export async function getUserSoundEffects(userId: string): Promise<GeneratedSoundEffect[]> {
  const cached = getLocalCache<GeneratedSoundEffect>(CACHE_KEYS.SFX, userId);
  if (!firestore) return cached;

  try {
    const q = query(collection(firestore, 'sound_effects'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteSfx: GeneratedSoundEffect[] = [];
      snapshot.forEach((docSnap) => {
        remoteSfx.push(docSnap.data() as GeneratedSoundEffect);
      });
      remoteSfx.sort((a, b) => b.createdAt - a.createdAt);
      setLocalCache(CACHE_KEYS.SFX, userId, remoteSfx);
      return remoteSfx;
    }
  } catch (error) {
    console.warn('Firestore getUserSoundEffects warning, using cache:', error);
  }
  return cached;
}

export async function deleteSoundEffect(sfxId: string, userId: string): Promise<void> {
  const localList = getLocalCache<GeneratedSoundEffect>(CACHE_KEYS.SFX, userId);
  setLocalCache(CACHE_KEYS.SFX, userId, localList.filter((s) => s.id !== sfxId));

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'sound_effects', sfxId));
    } catch (e) {
      console.warn('Firestore deleteSoundEffect error:', e);
    }
  }
}

// -------------------------------------------------------------
// PROJECTS
// -------------------------------------------------------------
export async function saveProject(project: StudioProject): Promise<void> {
  const localList = getLocalCache<StudioProject>(CACHE_KEYS.PROJECTS, project.userId);
  const updatedList = [project, ...localList.filter((p) => p.id !== project.id)];
  setLocalCache(CACHE_KEYS.PROJECTS, project.userId, updatedList);

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'projects', project.id), project);
    } catch (e) {
      console.warn('Firestore saveProject fallback:', e);
    }
  }
}

export async function getUserProjects(userId: string): Promise<StudioProject[]> {
  const cached = getLocalCache<StudioProject>(CACHE_KEYS.PROJECTS, userId);
  if (!firestore) return cached;

  try {
    const q = query(collection(firestore, 'projects'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteProjects: StudioProject[] = [];
      snapshot.forEach((docSnap) => {
        remoteProjects.push(docSnap.data() as StudioProject);
      });
      remoteProjects.sort((a, b) => b.updatedAt - a.updatedAt);
      setLocalCache(CACHE_KEYS.PROJECTS, userId, remoteProjects);
      return remoteProjects;
    }
  } catch (error) {
    console.warn('Firestore getUserProjects warning, using cache:', error);
  }
  return cached;
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const localList = getLocalCache<StudioProject>(CACHE_KEYS.PROJECTS, userId);
  setLocalCache(CACHE_KEYS.PROJECTS, userId, localList.filter((p) => p.id !== projectId));

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'projects', projectId));
    } catch (e) {
      console.warn('Firestore deleteProject error:', e);
    }
  }
}

// -------------------------------------------------------------
// SUPPORT TICKETS
// -------------------------------------------------------------
export async function createSupportTicket(ticket: SupportTicket): Promise<void> {
  const localList = getLocalCache<SupportTicket>(CACHE_KEYS.TICKETS, ticket.userId);
  setLocalCache(CACHE_KEYS.TICKETS, ticket.userId, [ticket, ...localList]);

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'support_tickets', ticket.id), ticket);
    } catch (e) {
      console.warn('Firestore createSupportTicket fallback to local:', e);
    }
  }
}

export async function getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
  const cached = getLocalCache<SupportTicket>(CACHE_KEYS.TICKETS, userId);
  if (!firestore) return cached;

  try {
    const q = query(collection(firestore, 'support_tickets'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        tickets.push(docSnap.data() as SupportTicket);
      });
      tickets.sort((a, b) => b.createdAt - a.createdAt);
      setLocalCache(CACHE_KEYS.TICKETS, userId, tickets);
      return tickets;
    }
  } catch (error) {
    console.warn('Firestore getUserSupportTickets warning, using cache:', error);
  }
  return cached;
}

// -------------------------------------------------------------
// ASSISTANT CHAT HISTORY
// -------------------------------------------------------------
export function getAssistantChatHistory(userId: string): AssistantMessage[] {
  return getLocalCache<AssistantMessage>(CACHE_KEYS.CHATS, userId);
}

export function saveAssistantChatHistory(userId: string, messages: AssistantMessage[]): void {
  setLocalCache(CACHE_KEYS.CHATS, userId, messages);
}

export function clearAssistantChatHistory(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${CACHE_KEYS.CHATS}_${userId}`);
  }
}

