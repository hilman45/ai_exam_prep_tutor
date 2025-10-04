'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface LottieAnimationProps {
  src: string
  className?: string
  autoplay?: boolean
  loop?: boolean
  speed?: number
}

export default function LottieAnimation({ 
  src, 
  className = "", 
  autoplay = true, 
  loop = true, 
  speed = 1 
}: LottieAnimationProps) {
  return (
    <DotLottieReact
      src={src}
      className={className}
      autoplay={autoplay}
      loop={loop}
      speed={speed}
    />
  )
}
