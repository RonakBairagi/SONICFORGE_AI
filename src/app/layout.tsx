import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AudioPlayerProvider } from '@/context/AudioPlayerContext';

export const metadata: Metadata = {
  title: 'SonicForge AI — Professional AI Music & Sound Studio',
  description:
    'Production-grade Generative AI Music & Sound Effects studio with real-time ElevenLabs models, Rime Coda voice guidance, and persistent project workspaces.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-midnight-950 text-slate-100 min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <AudioPlayerProvider>{children}</AudioPlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

