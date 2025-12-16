import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Urbanist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { TRPCProvider } from "@/components/trpc-provider"
import "./globals.css"

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" })
const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist" })

export const metadata: Metadata = {
  title: "Argus - Plateforme Agences",
  description: "Plateforme de gestion des mandats pour agences de détectives privés",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${urbanist.variable} ${montserrat.variable} font-urbanist antialiased`}>
        <TRPCProvider>
          {children}
        </TRPCProvider>
        <Analytics />
      </body>
    </html>
  )
}
