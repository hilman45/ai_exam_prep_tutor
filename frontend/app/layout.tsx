import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import '../styles/globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'PrepWise - AI Study Partner',
  description: 'Never study alone again. PrepWise is your AI study partner—always ready to quiz you, simplify tricky topics, and keep you on track until exam day.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-poppins`}>{children}</body>
    </html>
  )
}
