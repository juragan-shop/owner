import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { idID } from "@clerk/localizations";
import { ThemeContextProvider } from "@/context/useThemeContext";

import { Nunito_Sans } from "next/font/google";
import QueryTanstack from "@/context/useTanstackQuery";
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
});


export const metadata: Metadata = {
  title: "PasarKita",
  description: "Bahan dapur segar, sampai sebelum jam masak.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider localization={idID}>
      <ThemeContextProvider>
        <html
          lang="id"
          className={`dark ${nunitoSans.variable} h-[100%] antialiased`}
        >

          <body className="">
            <QueryTanstack>
              {children}
            </QueryTanstack>

          </body>
        </html>
      </ThemeContextProvider>
    </ClerkProvider>
  );
}