import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Tracker | Shathish Kumaran",
  description: "Personal Tracker for UpSkilling and Routine Tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-screen overflow-hidden antialiased`}
    >
      <body className="h-screen overflow-hidden bg-[#f4f4f5] text-[#0a0a0a] font-sans flex selection:bg-[#1e1e1e] selection:text-white">
        <Navbar />
        <main className="flex-1 h-full min-w-0 overflow-y-auto p-6 md:p-10">
          {children}
        </main>
      </body>
    </html>
  );
}
