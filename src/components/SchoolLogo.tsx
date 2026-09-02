import React from 'react';

interface SchoolLogoProps {
  className?: string;
  customLogoUrl?: string | null;
  size?: number;
  showText?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = 'w-10 h-10',
  customLogoUrl,
  size = 40,
  showText = false,
}) => {
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="國立成功商業水產職業學校校徽"
        className={`${className} object-contain rounded-full bg-white shadow-xs border border-slate-200`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Official CKVS National Chenggong Commercial & Fishery Vocational High School Emblem (Vector SVG)
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="國立成功商業水產職業學校校徽"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="ckvs-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        
        <linearGradient id="ckvs-wave" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="ckvs-dolphin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#bae6fd" />
          <stop offset="80%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="ckvs-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        
        <radialGradient id="ckvs-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </radialGradient>

        {/* Text path */}
        <path
          id="text-path-top"
          d="M 22 80 A 58 58 0 0 1 138 80"
        />
        <path
          id="text-path-bottom"
          d="M 134 82 A 54 54 0 0 1 26 82"
        />
      </defs>

      {/* Outer Golden Border & Shadow Ring */}
      <circle cx="80" cy="80" r="78" fill="url(#ckvs-gold)" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="74" fill="url(#ckvs-ring)" stroke="#ffffff" strokeWidth="1.2" />

      {/* Outer Blue Band with School Name */}
      <text fill="#ffffff" fontSize="10.5" fontWeight="bold" letterSpacing="2.2" textAnchor="middle">
        <textPath href="#text-path-top" startOffset="50%">
          國立成功商業水產職業學校
        </textPath>
      </text>

      <text fill="#fef08a" fontSize="9.5" fontWeight="bold" letterSpacing="3" textAnchor="middle">
        <textPath href="#text-path-bottom" startOffset="50%">
          ★ CKVS • 1990 ★
        </textPath>
      </text>

      {/* Inner White Shield / Circle */}
      <circle cx="80" cy="80" r="50" fill="url(#ckvs-bg)" stroke="url(#ckvs-gold)" strokeWidth="2.5" />

      {/* Surging Sea Waves (水產精神) */}
      <g>
        {/* Back Wave */}
        <path
          d="M 36 94 Q 52 82 68 93 T 100 93 T 124 96 L 124 116 Q 102 128 80 128 Q 58 128 36 116 Z"
          fill="#0284c7"
          opacity="0.85"
        />
        {/* Mid Wave */}
        <path
          d="M 33 100 Q 50 88 70 99 T 106 98 T 127 103 L 127 118 C 114 126 98 130 80 130 C 62 130 46 126 33 118 Z"
          fill="url(#ckvs-wave)"
        />
        {/* Front Wave Splash */}
        <path
          d="M 38 108 Q 58 96 78 107 T 118 106 Q 124 109 126 112 C 113 124 97 129 80 129 C 63 129 47 124 38 115 Z"
          fill="#38bdf8"
          opacity="0.9"
        />
      </g>

      {/* Sun / Beacon of Knowledge in Background */}
      <circle cx="106" cy="54" r="13" fill="url(#ckvs-gold)" opacity="0.9" />
      <circle cx="106" cy="54" r="10" fill="#fef08a" />

      {/* Leaping Dolphin (海豚 - 大躍進精神) */}
      <g transform="translate(0, -3)">
        {/* Dolphin Body */}
        <path
          d="M 45 92 C 43 78 52 56 70 48 C 88 40 108 45 118 56 C 122 61 123 66 120 70 C 115 76 102 78 92 74 C 84 70 79 64 74 65 C 67 66 58 78 52 90 C 49 95 46 95 45 92 Z"
          fill="url(#ckvs-dolphin)"
          stroke="#0369a1"
          strokeWidth="1.2"
        />
        {/* Dolphin Snout & Beak */}
        <path
          d="M 118 56 C 124 57 127 59 128 62 C 127 64 123 66 119 65 Z"
          fill="#e0f2fe"
          stroke="#0369a1"
          strokeWidth="0.8"
        />
        {/* Dolphin Eye */}
        <circle cx="112" cy="56" r="2.2" fill="#0f172a" />
        <circle cx="112.6" cy="55.4" r="0.8" fill="#ffffff" />
        
        {/* Dolphin Dorsal Fin */}
        <path
          d="M 88 44 C 92 36 98 34 102 36 C 100 42 96 46 92 46 Z"
          fill="#0284c7"
          stroke="#0369a1"
          strokeWidth="0.8"
        />
        {/* Dolphin Pectoral Fin */}
        <path
          d="M 80 66 C 85 73 88 80 84 83 C 81 83 78 77 78 70 Z"
          fill="#38bdf8"
          stroke="#0369a1"
          strokeWidth="0.8"
        />
        {/* Dolphin Tail Fluke */}
        <path
          d="M 46 91 C 41 93 35 91 32 87 C 34 92 37 97 42 101 C 44 98 45 94 46 91 Z"
          fill="#0284c7"
          stroke="#0369a1"
          strokeWidth="0.8"
        />
        <path
          d="M 45 92 C 45 97 47 102 51 106 C 51 101 49 96 46 93 Z"
          fill="#38bdf8"
          stroke="#0369a1"
          strokeWidth="0.8"
        />
      </g>

      {/* Commercial & Modern Vocational Ribbon "成功商水" */}
      <g transform="translate(0, 5)">
        <rect x="52" y="112" width="56" height="15" rx="3.5" fill="#1e3a8a" stroke="url(#ckvs-gold)" strokeWidth="1.5" />
        <text x="80" y="123.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle" letterSpacing="1.2">
          成功商水
        </text>
      </g>
    </svg>
  );
};
