"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import type { Decomposition } from "@/types/hanja";

interface Props {
  char: string;
  reading: string;
  decomposition: Decomposition | null;
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  semantic: { bg: "bg-semantic-bg", text: "text-semantic", border: "border-semantic/20", label: "의부(義符)" },
  phonetic: { bg: "bg-phonetic-bg", text: "text-primary-dark", border: "border-primary/20", label: "성부(聲符)" },
  ideographic: { bg: "bg-ideographic-bg", text: "text-ideographic", border: "border-ideographic/20", label: "의부(意符)" },
};

function guessComponentRole(
  component: string,
  index: number,
  components: string[],
  hasMultiple: boolean
): string {
  const semanticRadicals = [
    "氵", "扌", "亻", "口", "女", "木", "火", "土", "金", "石",
    "日", "月", "目", "心", "忄", "言", "訁", "食", "飠", "糸",
    "糹", "衣", "衤", "水", "手", "人", "竹", "艹", "辶", "阝",
    "刂", "力", "又", "尸", "广", "疒", "禾", "穴", "立", "耳",
    "肉", "虫", "貝", "車", "馬", "魚", "鳥",
  ];

  if (!hasMultiple) return "ideographic";
  if (semanticRadicals.includes(component)) return "semantic";
  if (index === 0) return "semantic";
  return "phonetic";
}

export default function AssemblyTab({ char, reading, decomposition }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  const replay = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    el.classList.remove("animating");
    void el.offsetWidth;
    el.classList.add("animating");
  }, []);

  if (!decomposition || !decomposition.components || decomposition.components.length === 0) {
    return (
      <div className="p-8 text-center text-text-secondary text-[15px] p-12 bg-bg rounded-2xl border border-border/50 mx-5 my-6">
        <span className="text-5xl block mb-4 opacity-70">&#128300;</span>
        <strong className="text-text">{char}</strong>의 분해 정보가 아직 없습니다.
      </div>
    );
  }

  const components = decomposition.components;
  const hasMultiple = components.length >= 2;

  return (
    <div className="p-6 animate-[fadeIn_0.4s_ease-out]">
      <div
        ref={stageRef}
        className="flex items-center justify-center gap-3 py-10 flex-wrap animating
          [&.animating_.comp-chip]:animate-[compFloat_0.7s_cubic-bezier(0.2,0.8,0.2,1)]
          [&.animating_.assembly-op]:animate-[opPulse_0.5s_0.4s_ease-out_both]
          [&.animating_.result-chip]:animate-[resultAppear_0.6s_0.7s_cubic-bezier(0.2,0.8,0.2,1)_both]"
      >
        {components.map((comp, i) => {
          const role = guessComponentRole(comp, i, components, hasMultiple);
          const style = ROLE_STYLES[role] || ROLE_STYLES.ideographic;

          return (
            <div key={`${comp}-${i}`} className="contents">
              {i > 0 && (
                <div className="assembly-op text-3xl font-bold text-border px-1">+</div>
              )}
              <Link
                href={`/hanja/${encodeURIComponent(comp)}`}
                className={`comp-chip flex flex-col items-center bg-surface border border-b-4 ${style.border}
                  rounded-2xl px-5 py-5 cursor-pointer transition-all duration-300
                  shadow-sm min-w-[88px] no-underline text-text
                  hover:border-primary/40 hover:-translate-y-1 hover:shadow-md`}
              >
                <span className="font-[var(--font-hanja)] text-[44px] font-bold">{comp}</span>
                <span className={`text-[12px] font-bold mt-2 px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </Link>
            </div>
          );
        })}

        <div className="assembly-op text-3xl font-bold text-border px-1">=</div>

        <div className="result-chip flex flex-col items-center bg-gradient-to-br from-primary-light to-blue-50 border border-primary/20
          rounded-2xl px-8 py-5 shadow-md border-b-4 border-b-primary/30">
          <span className="font-[var(--font-hanja)] text-[56px] font-bold text-primary drop-shadow-sm">{char}</span>
          <span className="text-[14px] text-primary-dark font-bold mt-1 tracking-wide">{reading}</span>
        </div>
      </div>

      {decomposition.ids && (
        <div className="text-center mt-6 font-[var(--font-hanja)] text-[22px] text-text-secondary bg-surface inline-block mx-auto px-6 py-2 rounded-2xl border border-border/50 shadow-sm w-fit flex justify-center">
          구조식: <span className="text-primary font-bold ml-2 tracking-widest">{decomposition.ids}</span>
        </div>
      )}

      <button
        onClick={replay}
        className="flex items-center justify-center gap-2 mx-auto mt-10 bg-surface border border-border/80 text-text-secondary
          rounded-xl px-6 py-2.5 font-[var(--font-ui)] text-[14px] font-bold shadow-sm
          cursor-pointer transition-all duration-300 hover:bg-bg hover:text-primary hover:border-primary/30 hover:-translate-y-0.5"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        다시 보기
      </button>
    </div>
  );
}
