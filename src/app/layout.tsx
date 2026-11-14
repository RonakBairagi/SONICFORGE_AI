import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AudioPlayerProvider } from '@/context/AudioPlayerContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'SonicForge AI — Professional AI Music & Sound Studio',
  description:
    'Production-grade Generative AI Music & Sound Effects studio with real-time ElevenLabs models, singing AI vocals, Rime Coda voice guidance, and persistent project workspaces.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AudioPlayerProvider>{children}</AudioPlayerProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
