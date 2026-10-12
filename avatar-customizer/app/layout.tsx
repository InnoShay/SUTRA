import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BitVRM — Free & Open Source 3D Avatar Studio',
  description: 'Self-hosted, zero-cost 3D avatar customizer built on Next.js, Three.js, and Pixiv VRM. Fully customizable hair, skin, outfits, accessories, poses, and expressions with no external API lock-in.',
  keywords: ['3D Avatar', 'VRM', 'VRoid Studio', 'Three.js', 'React Three Fiber', 'Next.js', 'Customizer'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
