import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Model Viewer",
  description: "PyTorch 모델 구조 시각화 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
