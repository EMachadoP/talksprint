import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TalkSprint — Inglês Conversacional B1 em 16 Semanas",
  description:
    "Programa intensivo, adaptativo e conversation-first para falantes de português. Foco em tarefas reais, SRS produtivo, pronúncia contrastiva PT-BR e avaliação CEFR por transferência.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen selection:bg-[#0e6b50] selection:text-[#fcfbf8]">
        {children}
      </body>
    </html>
  );
}
