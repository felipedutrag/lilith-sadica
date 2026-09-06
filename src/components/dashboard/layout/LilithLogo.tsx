"use client"

export function LilithLogo({ className }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center cursor-pointer w-11 h-11 group transition-all duration-700 shrink-0">
      <svg width="34" height="34" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-700 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.95)] ${className || ''}`}>
        <rect x="4.5" y="4.5" width="11" height="11" rx="2.5" transform="rotate(45 10 10)" stroke="#000000" strokeWidth="1.2" />
        <line x1="2.2" y1="10" x2="17.8" y2="10" stroke="#000000" strokeWidth="1.2" />
        <g filter="url(#globalRedRitualGlow)">
          <circle cx="10" cy="10" r="2.2" stroke="#ff1111" strokeWidth="0.9" className="animate-pulse" />
          <path d="M10 8.5V11.5M8.5 10H11.5" stroke="#ff0000" strokeWidth="1.2" strokeLinecap="square" className="animate-pulse" />
        </g>
      </svg>
    </div>
  )
}




