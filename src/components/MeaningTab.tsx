"use client";

import { useState } from "react";
import type { MeaningTreeNode } from "@/types/hanja";

interface Props {
  unihanDef: string | null;
  meaningTree: MeaningTreeNode[];
}

const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  root: { bg: "bg-root-bg", text: "text-root", label: "뿌리" },
  extension: { bg: "bg-extend-bg", text: "text-extend", label: "확장" },
  metaphor: { bg: "bg-metaphor-bg", text: "text-metaphor", label: "비유" },
  specialization: { bg: "bg-special-bg", text: "text-special", label: "특수" },
};

function MeaningNode({
  node,
  expandAll,
}: {
  node: MeaningTreeNode;
  expandAll: boolean | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandAll !== null ? expandAll : expanded;

  const relation = node.relation || "root";
  const style = BADGE_STYLES[relation] || BADGE_STYLES.root;

  return (
    <div className="relative mb-3">
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        className="flex items-start gap-3 bg-surface border border-border/80 rounded-2xl
          px-4 py-3.5 cursor-pointer transition-all duration-300
          hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
      >
        <div
          className={`shrink-0 w-6 h-6 flex items-center justify-center text-[10px]
            text-primary/60 transition-transform duration-300 mt-0.5
            ${!hasChildren ? "invisible" : ""}
            ${isExpanded ? "rotate-90 text-primary" : ""}`}
        >
          &#9654;
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-xl mt-0.5
            ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[15px] font-bold text-text leading-tight">{node.label}</div>
          {node.short_gloss && (
            <div className="text-[13px] text-text-secondary mt-1">{node.short_gloss}</div>
          )}
          {node.example && (
            <div className="text-[13px] text-primary/90 mt-2 font-medium bg-primary/5 px-2.5 py-1.5 rounded-lg inline-block border border-primary/10">
              {node.example}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul className="list-none pl-6 mt-2 border-l-2 border-primary/10 ml-4 space-y-3">
          {node.children.map((child) => (
            <li key={child.id}>
              <MeaningNode node={child} expandAll={expandAll} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MeaningTab({ unihanDef, meaningTree }: Props) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  if (meaningTree.length === 0) {
    return (
      <div className="p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center text-text-secondary text-[15px] py-10 mb-4 flex flex-col items-center">
          <span className="text-5xl block mb-4 opacity-80">&#128218;</span>
          <p className="leading-relaxed">의미 트리 데이터가 아직 큐레이션되지 않았습니다.</p>
        </div>
        {unihanDef && (
          <div className="bg-surface border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="text-[13px] font-bold text-primary mb-2 flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full"></div>
              기본 뜻 (유니한 영문 정의)
            </div>
            <div className="text-[15px] text-text leading-relaxed">{unihanDef}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex gap-2.5 mb-6">
        <button
          onClick={() => setExpandAll(true)}
          className="bg-surface border border-border/80 rounded-full px-4 py-2
            font-[var(--font-ui)] text-[13px] font-semibold cursor-pointer
            transition-all duration-300 text-text-secondary shadow-sm
            hover:border-primary/50 hover:text-primary hover:bg-primary/5 hover:shadow"
        >
          모두 펼치기
        </button>
        <button
          onClick={() => setExpandAll(false)}
          className="bg-surface border border-border/80 rounded-full px-4 py-2
            font-[var(--font-ui)] text-[13px] font-semibold cursor-pointer
            transition-all duration-300 text-text-secondary shadow-sm
            hover:border-primary/50 hover:text-primary hover:bg-primary/5 hover:shadow"
        >
          모두 접기
        </button>
      </div>

      <div className="space-y-3">
        {meaningTree.map((node) => (
          <MeaningNode key={node.id} node={node} expandAll={expandAll} />
        ))}
      </div>
    </div>
  );
}
