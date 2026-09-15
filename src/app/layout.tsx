import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sóró — Aprende Español Hablando',
  description: 'Conversación natural en español con inteligencia artificial local, aprendizaje espaciado y voz fluida.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FFF8EE] text-[#362A22] antialiased selection:bg-[#FFF0C7] selection:text-[#FF8A4C]">
        {children}
      </body>
    </html>
  );
}
