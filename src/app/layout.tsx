import type { Metadata } from "next";
import { Poppins, Montserrat, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import MessagePopup from "@/components/MessagePopup";
import PWAService from "@/components/PWAService";
import PWAPrompt from "@/components/PWAPrompt";
import NavigationErrorBoundary from "@/components/NavigationErrorBoundary";
import { Providers } from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Afroboost",
  description: "Danse Afrobeat & Fitness - Une expérience immersive unique.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${poppins.variable} ${montserrat.variable} ${inter.variable} antialiased`}>
        <NavigationErrorBoundary>
          <Providers>
            <PWAService />
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <ChatbotWidget />
            <MessagePopup />
            <PWAPrompt />
          </Providers>
        </NavigationErrorBoundary>
      </body>
    </html>
  );
}
