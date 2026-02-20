"use client";

import Link from "next/link";
import type { PhoneticSibling } from "@/types/hanja";

interface Props {
  currentChar: string;
  phoneticRoot: string | null;
  siblings: PhoneticSibling[];
  charType?: string;
}

export default function DerivationTab({ currentChar, phoneticRoot, siblings, charType }: Props) {
  if (!siblings || siblings.length === 0) {
    return (
      <div className="p-6 text-center text-text-secondary text-[15px] py-12 flex flex-col items-center">
        <span className="text-5xl block mb-4 opacity-80">&#128301;</span>
        <p className="leading-relaxed">
          <strong>{currentChar}</strong>은(는){" "}
          {charType === "회의자" ? (
            <>
              <strong>회의자(會意字)</strong>로,<br />
              성부(소리 부분)가 없어 음 계열 파생이 없습니다.<br /><br />
              대신 아래 <strong className="text-primary">의미 변화</strong> 섹션에서<br />뜻의 확장 과정을 살펴보세요.
            </>
          ) : (
            <>파생 계열 정보가 아직 없습니다.</>
          )}
        </p>
      </div>
    );
  }

  // 성부의 음(reading) 가져오기
  const rootReading = phoneticRoot
    ? siblings.find((s) => s.char === phoneticRoot)?.reading || ""
    : "";

  // 3×3 그리드: 중앙(index 4) = 성부, 나머지 8칸 = 형제 한자
  const gridSiblings = siblings.slice(0, 8);
  const overflowSiblings = siblings.slice(8);

  // 9칸 구성: 0-3 = 형제[0-3], 4 = 성부, 5-8 = 형제[4-7]
  const gridCells: (PhoneticSibling | "root" | null)[] = [];
  for (let i = 0; i < 9; i++) {
    if (i === 4) {
      gridCells.push("root");
    } else {
      const sibIdx = i < 4 ? i : i - 1;
      gridCells.push(gridSiblings[sibIdx] ?? null);
    }
  }

  return (
    <div className="p-5 animate-[fadeIn_0.4s_ease-out]">
      {/* 3×3 그리드 맵 */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto my-6">
        {gridCells.map((cell, i) => {
          if (cell === "root") {
            return (
              <div
                key="root"
                className="aspect-square bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl flex flex-col
                  items-center justify-center font-[var(--font-hanja)] text-[32px] font-bold
                  shadow-lg shadow-primary/25 relative z-10"
              >
                {phoneticRoot}
                <span className="text-[11px] font-medium font-[var(--font-ui)] mt-1">{rootReading}</span>
              </div>
            );
          }
          if (cell === null) {
            return (
              <div key={`empty-${i}`} className="aspect-square rounded-2xl border-2 border-dashed border-border/40 bg-surface/30" />
            );
          }
          const isCurrent = cell.char === currentChar;
          return (
            <Link
              key={cell.character_id}
              href={`/hanja/${encodeURIComponent(cell.char)}`}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center
                font-[var(--font-hanja)] text-[24px] font-bold cursor-pointer
                transition-all duration-300 no-underline
                shadow-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-md
                ${isCurrent
                  ? "bg-primary/5 border-2 border-primary text-text shadow-primary/10"
                  : "bg-surface border border-border/60 text-text"}`}
            >
              {cell.char}
              <span className={`text-[10px] font-medium font-[var(--font-ui)] mt-0.5
                ${isCurrent ? "text-primary" : "text-text-secondary"}`}>
                {cell.reading}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 넘치는 형제 한자 (9개 초과) */}
      {overflowSiblings.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-[300px] mx-auto">
          {overflowSiblings.map((m) => {
            const isCurrent = m.char === currentChar;
            return (
              <Link
                key={m.character_id}
                href={`/hanja/${encodeURIComponent(m.char)}`}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center
                  font-[var(--font-hanja)] text-xl font-bold no-underline transition-all duration-300
                  ${isCurrent
                    ? "bg-primary/5 border-2 border-primary text-text"
                    : "bg-surface border border-border/60 text-text hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm"}`}
              >
                {m.char}
                <span className="text-[9px] font-medium font-[var(--font-ui)] text-text-secondary mt-0.5">{m.reading}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* 리스트 뷰 */}
      <div className="mt-8">
        <div className="text-[14px] font-bold text-text mb-3 pl-1 flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full"></div>
          같은 소리 계열 {phoneticRoot && <span className="text-text-secondary font-medium">({phoneticRoot})</span>}
        </div>
        <div className="flex flex-col gap-2.5">
          {siblings.map((m) => {
            const isCurrent = m.char === currentChar;
            return (
              <Link
                key={m.character_id}
                href={`/hanja/${encodeURIComponent(m.char)}`}
                className={`flex items-center gap-3 bg-surface border rounded-2xl
                  px-4 py-3 cursor-pointer transition-all duration-300
                  no-underline text-text shadow-sm hover:shadow-md hover:-translate-y-0.5
                  ${isCurrent
                    ? "border-primary bg-primary/5 shadow-primary/5"
                    : "border-border/60 hover:border-primary/40"}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-bg border border-border/50">
                  <span className="font-[var(--font-hanja)] text-2xl font-bold">{m.char}</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-[15px]">{m.reading}</span>
                  <span className="text-[13px] text-text-secondary mt-0.5 line-clamp-1">
                    {m.meaning || "의미 정보 없음"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
