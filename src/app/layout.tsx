import "./globals.css";
import { Inter, Poppins, Montserrat } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ChatbotWidget from "@/components/ChatbotWidget";
import MessagePopup from "@/components/MessagePopup";
import PWAPrompt from "@/components/PWAPrompt";
import PWAService from "@/components/PWAService";
import NavigationErrorBoundary from "@/components/NavigationErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-poppins" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-montserrat" });

export const metadata = {
  title: "Afroboost",
  description: "Danse Afrobeat & Fitness – Cardio, rythme, énergie !",
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

