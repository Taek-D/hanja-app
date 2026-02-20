"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/radicals", label: "부수", icon: "radicals" },
  { href: "/search", label: "검색", icon: "search" },
  { href: "/review", label: "복습", icon: "review" },
  { href: "/me", label: "내 정보", icon: "profile" },
] as const;

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "currentColor" : "currentColor";
  const strokeWidth = active ? "2.5" : "2";

  switch (icon) {
    case "home":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "radicals":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "search":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "mission":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "review":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "profile":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname();

  // 한자 상세 페이지, 온보딩, 계열맵 등에서는 네비게이션 숨김
  const hideOnPaths = ["/hanja/", "/onboarding", "/series/", "/radicals/"];
  const shouldHide = hideOnPaths.some((p) => pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px]
        bg-surface/80 backdrop-blur-xl border-t border-border/60 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]
        flex items-center justify-around px-2 py-2 z-50 transition-all"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex flex-col items-center gap-1.5 py-1 px-4 rounded-xl
              no-underline transition-all duration-300 min-w-[64px] relative
              ${isActive
                ? "text-primary scale-105"
                : "text-text-secondary hover:text-primary hover:bg-primary-light/30"
              }`}
          >
            {isActive && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-[fadeIn_0.2s_ease-out]" />
            )}
            <NavIcon icon={item.icon} active={isActive} />
            <span className={`text-[11px] font-medium tracking-tight ${isActive ? "font-bold" : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
