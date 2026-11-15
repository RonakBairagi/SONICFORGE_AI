import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Converts a data URL to an ArrayBuffer/Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(';base64,');
  const mimeMatch = header.match(/:(.*?)$/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';

  const binaryString = typeof window !== 'undefined' ? window.atob(base64Data) : Buffer.from(base64Data, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Uploads an audio track or sound effect to Firebase Storage.
 * Returns the permanent HTTPS download URL, or null if storage is unavailable.
 */
export async function uploadAudioToStorage(
  audioData: string | ArrayBuffer | Blob,
  userId: string,
  itemId: string,
  extension: 'mp3' | 'wav' = 'mp3'
): Promise<string | null> {
  if (!storage || !userId || userId === 'guest') {
    return null;
  }

  try {
    let blob: Blob;
    if (typeof audioData === 'string') {
      if (audioData.startsWith('data:audio/')) {
        blob = dataUrlToBlob(audioData);
      } else if (audioData.startsWith('http://') || audioData.startsWith('https://')) {
        // It's already an external HTTP URL (e.g. from ElevenLabs CDN), no need to re-upload unless needed
        return audioData;
      } else {
        return null;
      }
    } else if (audioData instanceof Blob) {
      blob = audioData;
    } else {
      blob = new Blob([audioData], { type: 'audio/mpeg' });
    }

    const storagePath = `users/${userId}/audio/${itemId}.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Timeout guard: 12 seconds max for storage upload to ensure non-blocking UI
    const uploadPromise = uploadBytes(storageRef, blob, {
      contentType: 'audio/mpeg',
      customMetadata: {
        uploadedAt: Date.now().toString(),
        itemId,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 12000)
    );

    await Promise.race([uploadPromise, timeoutPromise]);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload notice (falling back to local):', error);
    return null;
  }
}

/**
 * Deletes an audio file from Firebase Storage
 */
export async function deleteAudioFromStorage(storagePathOrUrl: string): Promise<void> {
  if (!storage || !storagePathOrUrl) return;

  try {
    let storageRef;
    if (storagePathOrUrl.startsWith('gs://') || storagePathOrUrl.startsWith('https://')) {
      storageRef = ref(storage, storagePathOrUrl);
    } else {
      storageRef = ref(storage, storagePathOrUrl);
    }
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Firebase Storage delete notice:', error);
  }
}
