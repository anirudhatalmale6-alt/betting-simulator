import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BetSlipProvider } from "@/components/BetSlipProvider";
import Navbar from "@/components/Navbar";
import BetSlip from "@/components/BetSlip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BetNow",
  description: "Experience sports betting with play money",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <AuthProvider>
          <BetSlipProvider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
              {children}
            </main>
            <BetSlip />
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
