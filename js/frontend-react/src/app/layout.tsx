import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ReactNode } from 'react';

import { ApplicationLayout } from './application-layout';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '1FPGA Frontend',
  description: 'Debug and manage 1FPGA frontend from a browser',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-gray-100">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ApplicationLayout>{children}</ApplicationLayout>
      </body>
    </html>
  );
}
