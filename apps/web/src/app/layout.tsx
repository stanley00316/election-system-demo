import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
});

export const metadata: Metadata = {
  title: '選情系統 | 選民關係管理平台',
  description: '專為台灣選舉設計的選情分析與選民關係管理系統',
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansTC.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
