import { Orbitron, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
  weight: ['400', '700', '900'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '700'],
});

export const metadata = {
  title: 'PANOPTICON — STGCN Intrusion Command',
  description: 'Real-time WebGL-powered SOC dashboard for the Panopticon STGCN Intrusion Detection System. Visualizes network topology, threat propagation, and telemetry in real-time.',
  keywords: ['Panopticon', 'SOC', 'IDS', 'STGCN', 'cybersecurity', 'network monitoring'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-black text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
