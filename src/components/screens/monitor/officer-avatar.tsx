// Officer SVG avatar reused across multiple components
export function OfficerAvatar({ id }: { id: string }) {
  if (id === "yuri") {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" fill="#1C1917" />
        <path d="M0 0 L100 100 M100 0 L0 100" stroke="#FF5722" strokeWidth="4" opacity="0.4" />
        <polygon points="50,10 62,38 92,38 68,56 78,86 50,68 22,86 32,56 8,38 38,38" fill="#F15A24" opacity="0.2" />
        <path d="M25 45 L25 75 L50 90 L75 75 L75 45 Z" fill="#FDBA74" stroke="#1C1917" strokeWidth="4" strokeLinejoin="round" />
        <path d="M32 65 C40 65 42 58 50 58 C58 58 60 65 68 65 C72 65 72 70 68 70 C58 70 56 64 50 64 C44 64 42 70 32 70 C28 70 28 65 32 65 Z" fill="#1C1917" />
        <rect x="36" y="52" width="28" height="6" fill="#1C1917" rx="3" />
        <path d="M22 38 L45 42 M55 42 L78 38" stroke="#1C1917" strokeWidth="6" strokeLinecap="round" />
        <circle cx="38" cy="48" r="8" fill="#FFF" stroke="#1C1917" strokeWidth="3" />
        <circle cx="38" cy="48" r="3" fill="#1C1917" />
        <circle cx="62" cy="48" r="8" fill="#EF4444" stroke="#1C1917" strokeWidth="3" />
        <circle cx="62" cy="48" r="3" fill="#FFF" />
        <path d="M15 38 L85 38 L78 20 L22 20 Z" fill="#1E293B" stroke="#1C1917" strokeWidth="4" strokeLinejoin="round" />
        <path d="M10 38 Q50 32 90 38 L95 44 Q50 48 5 44 Z" fill="#F15A24" stroke="#1C1917" strokeWidth="4" />
        <polygon points="50,22 55,32 65,32 57,38 60,48 50,42 40,48 43,38 35,32 45,32" fill="#E11D48" />
      </svg>
    );
  }
  if (id === "gu") {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" fill="#1C1917" />
        <path d="M0 20 L100 80 M0 80 L100 20" stroke="#D946EF" strokeWidth="3" opacity="0.3" />
        <path d="M30 40 C30 75 40 88 50 88 C60 88 70 75 70 40 Z" fill="#FFEDD5" stroke="#1C1917" strokeWidth="4" />
        <path d="M22 45 C15 35 25 15 50 15 C75 15 85 35 78 45 L82 60 L75 58 L72 38 C60 25 40 25 28 38 L25 58 L18 60 Z" fill="#312E81" stroke="#1C1917" strokeWidth="3" />
        <path d="M28 35 Q40 30 44 38 M56 38 Q60 30 72 35" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M24 40 L45 42 L48 48 L32 50 Z" fill="#D946EF" fillOpacity="0.3" stroke="#1C1917" strokeWidth="3" />
        <path d="M76 40 L55 42 L52 48 L68 50 Z" fill="#D946EF" fillOpacity="0.3" stroke="#1C1917" strokeWidth="3" />
        <path d="M45 42 L55 42" stroke="#1C1917" strokeWidth="3" />
        <circle cx="35" cy="45" r="2" fill="#1C1917" />
        <circle cx="65" cy="45" r="2" fill="#1C1917" />
        <path d="M38 68 Q50 62 62 68" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="70" cy="72" r="2.5" fill="#1C1917" />
      </svg>
    );
  }
  // lin (default)
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="#1C1917" />
      <circle cx="50" cy="50" r="40" fill="#10B981" opacity="0.15" />
      <path d="M30 42 C30 75 38 85 50 85 C62 85 70 75 70 42 Z" fill="#FEF3C7" stroke="#1C1917" strokeWidth="4" />
      <path d="M25 40 Q15 22 45 15 Q75 10 75 35 Q85 45 72 48 C65 24 35 25 28 48 Z" fill="#78350F" stroke="#1C1917" strokeWidth="3.5" />
      <path d="M32 38 Q42 34 46 40 M54 40 Q58 34 68 38" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M33 46 Q38 43 41 46 M59 46 Q62 43 67 46" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="37" cy="48" r="9" fill="none" stroke="#111827" strokeWidth="2.5" />
      <circle cx="63" cy="48" r="9" fill="none" stroke="#111827" strokeWidth="2.5" />
      <path d="M46 48 L54 48" stroke="#111827" strokeWidth="2.5" />
      <path d="M43 65 Q50 72 57 65" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
