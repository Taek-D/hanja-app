"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function TabBar({ tabs, activeTab, onTabChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector(
      `[data-tab="${activeTab}"]`
    ) as HTMLElement | null;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border/60 flex shadow-sm relative"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-tab={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-4 bg-transparent border-none font-[var(--font-ui)]
            text-[15px] cursor-pointer relative transition-colors duration-300
            ${activeTab === tab.key ? "text-primary font-bold" : "text-text-secondary font-medium hover:text-primary/70"}`}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="absolute bottom-0 h-[3px] bg-primary rounded-t-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
}
