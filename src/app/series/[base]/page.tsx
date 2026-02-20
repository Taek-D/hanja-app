"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCharacterByChar, getPhoneticSiblings } from "@/lib/queries";
import type { PhoneticSibling } from "@/types/hanja";

function HanjaNode({ data }: { data: { label: string; reading: string; isRoot?: boolean } }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-full
        ${data.isRoot
          ? "w-20 h-20 bg-primary text-white shadow-[0_4px_12px_rgba(26,86,219,0.3)]"
          : "w-16 h-16 bg-surface border-2 border-border shadow-sm hover:border-primary"
        } transition-all duration-200`}
    >
      <span className={`font-[var(--font-hanja)] font-bold ${data.isRoot ? "text-3xl" : "text-2xl"}`}>
        {data.label}
      </span>
      <span className={`text-[10px] font-medium ${data.isRoot ? "text-white/80" : "text-text-secondary"}`}>
        {data.reading}
      </span>
    </div>
  );
}

const nodeTypes = { hanja: HanjaNode };

export default function SeriesPage({
  params,
}: {
  params: Promise<{ base: string }>;
}) {
  const { base: rawBase } = use(params);
  const base = decodeURIComponent(rawBase);
  const router = useRouter();

  const [phoneticRoot, setPhoneticRoot] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<PhoneticSibling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const charData = await getCharacterByChar(base);
        if (cancelled) return;

        if (!charData) {
          setError("한자를 찾을 수 없습니다.");
          return;
        }

        const phoneticData = await getPhoneticSiblings(charData.id);
        if (cancelled) return;

        setPhoneticRoot(phoneticData.phoneticRoot);
        setSiblings(phoneticData.siblings);
      } catch {
        if (!cancelled) {
          setError("데이터를 불러올 수 없습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [base]);

  const { nodes, edges } = useMemo(() => {
    if (siblings.length === 0) return { nodes: [], edges: [] };

    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    const resultNodes: Node[] = [];
    const resultEdges: Edge[] = [];

    // 중앙 노드 (성부)
    if (phoneticRoot) {
      const rootSibling = siblings.find((s) => s.char === phoneticRoot);
      resultNodes.push({
        id: "root",
        type: "hanja",
        position: { x: centerX - 40, y: centerY - 40 },
        data: {
          label: phoneticRoot,
          reading: rootSibling?.reading || "",
          isRoot: true,
        },
        draggable: true,
      });
    }

    // 형제 한자 원형 배치
    siblings.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / siblings.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 32;
      const y = centerY + radius * Math.sin(angle) - 32;

      resultNodes.push({
        id: s.character_id,
        type: "hanja",
        position: { x, y },
        data: { label: s.char, reading: s.reading },
        draggable: true,
      });

      if (phoneticRoot) {
        resultEdges.push({
          id: `e-root-${s.character_id}`,
          source: "root",
          target: s.character_id,
          style: { stroke: "#E5E7EB", strokeWidth: 2 },
        });
      }
    });

    return { nodes: resultNodes, edges: resultEdges };
  }, [siblings, phoneticRoot]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === "root") return;
      const sibling = siblings.find((s) => s.character_id === node.id);
      if (sibling) {
        router.push(`/hanja/${encodeURIComponent(sibling.char)}`);
      }
    },
    [siblings, router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">불러오는 중...</div>
      </div>
    );
  }

  if (error || siblings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5">
        <div className="text-5xl mb-4">&#128301;</div>
        <div className="text-lg font-semibold mb-2">{error || "파생 계열이 없습니다."}</div>
        <Link
          href="/"
          className="mt-4 bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold no-underline"
        >
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <Link
          href={`/hanja/${encodeURIComponent(base)}`}
          className="text-text-secondary hover:text-primary transition-colors no-underline"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">
          {phoneticRoot ? `${phoneticRoot} 계열 맵` : "파생 계열 맵"}
        </h1>
        <span className="text-xs text-text-secondary ml-auto">
          {siblings.length}자
        </span>
      </div>

      {/* 플로우 캔버스 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
