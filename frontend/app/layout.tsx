import type { Metadata } from 'next'
import '../styles/globals.css'

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
      <body className="font-space-grotesk">{children}</body>
    </html>
  )
}
