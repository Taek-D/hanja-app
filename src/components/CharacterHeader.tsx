"use client";

import type { CharacterDetail } from "@/types/hanja";
import { getCharImageSrc } from "@/lib/imageChar";
import { toast } from "./Toast";

interface Props {
  character: CharacterDetail;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function CharacterHeader({ character, isFavorite, onToggleFavorite }: Props) {
  const primaryReading = character.readings.find((r) => r.is_primary)?.value
    || character.readings[0]?.value || "";

  const charImgSrc = getCharImageSrc(character.char);

  const hasPhoneticComponent = character.decomposition?.components
    && character.decomposition.components.length >= 2;

  const charType = hasPhoneticComponent ? "형성자" : "회의자";
  const typeClass = hasPhoneticComponent
    ? "bg-phonetic-bg text-primary-dark border border-phonetic/20"
    : "bg-ideographic-bg text-ideographic border border-ideographic/20";

  return (
    <div className="bg-surface px-6 pt-10 pb-8 text-center border-b border-border/60 relative shadow-sm">
      <button
        onClick={() => {
          onToggleFavorite();
          toast(isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가");
        }}
        className={`absolute top-6 right-6 bg-transparent border-none text-[28px] cursor-pointer
          transition-all duration-300 hover:scale-110 active:scale-95 ${isFavorite ? "text-red-500 drop-shadow-sm" : "text-border hover:text-red-400"}`}
        aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      >
        {isFavorite ? "\u2665" : "\u2661"}
      </button>

      {charImgSrc ? (
        /* eslint-disable @next/next/no-img-element */
        <div className="flex justify-center mb-4">
          <img
            src={charImgSrc}
            alt={primaryReading}
            className="h-[88px] w-auto"
          />
        </div>
      ) : (
        <div className="font-[var(--font-hanja)] text-[88px] font-bold leading-none text-text mb-4 drop-shadow-sm">
          {character.char}
        </div>
      )}
      <div className="text-[28px] font-bold mt-2 text-primary tracking-tight">
        {primaryReading}
      </div>
      <div className="text-[16px] text-text-secondary mt-3 font-medium max-w-[80%] mx-auto leading-relaxed">
        {character.unihan_def || ""}
      </div>
      <div className="flex items-center justify-center gap-3 mt-5 text-[14px]">
        <span className="bg-bg text-text-secondary px-3 py-1 rounded-lg border border-border/60 font-medium">
          {character.strokes}획
        </span>
        {character.radical && (
          <span className="bg-bg text-text-secondary px-3 py-1 rounded-lg border border-border/60 font-medium">
            부수: {character.radical}
          </span>
        )}
      </div>
      <span className={`inline-block mt-4 px-3.5 py-1 rounded-full text-[13px] font-bold tracking-wide ${typeClass}`}>
        {charType}
      </span>
    </div>
  );
}
