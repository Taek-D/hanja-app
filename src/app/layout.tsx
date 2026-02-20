import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hanja",
  display: "swap",
});

export const metadata: Metadata = {
  title: "한자 분해·계열화 학습",
  description: "한자의 구조를 분해하고 계열로 묶어 학습하는 교양형 한문 교육 앱",
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "한자 분해·계열화 학습",
    description: "한자의 구조를 분해하고 계열로 묶어 학습하는 교양형 한문 교육 앱",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1E3A8A", // Updated to Deep Indigo
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} ${notoSerifKR.variable} antialiased`}
      >
        <div className="max-w-[480px] mx-auto relative min-h-screen pb-16 bg-white shadow-xl shadow-black/5 overflow-hidden">
          {/* Subtle background glow effect using pseudo-elements or absolute divs to add depth */}
          <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
