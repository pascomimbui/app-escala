import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/layout/UserContext";
import { ToastProvider } from "@/components/layout/Toast";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0e14",
};

export const metadata: Metadata = {
  title: "Escala PASCOM | Transmissão",
  description: "Sistema de gerenciamento de escala de voluntários de transmissão da igreja. Organize câmera e mesa de transmissão com facilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <UserProvider>
          <ToastProvider>
            <Header />
            <main className="flex-1 pb-20 md:pb-6">
              {children}
            </main>
            <BottomNav />
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
