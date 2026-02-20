import Link from "next/link";
import { getCharImageSrc } from "@/lib/imageChar";

interface Props {
  char: string;
  reading: string;
  meaning?: string | null;
  size?: "sm" | "md" | "lg";
}

export default function CharacterCard({ char, reading, meaning, size = "md" }: Props) {
  const sizeStyles = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-5 py-5",
  };

  const charSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  const charImgSrc = getCharImageSrc(char);
  const imgHeights = { sm: "h-7", md: "h-9", lg: "h-12" };

  return (
    <Link
      href={`/hanja/${encodeURIComponent(char)}`}
      className={`flex items-center gap-3 bg-surface border border-border rounded-xl
        ${sizeStyles[size]} no-underline text-text
        transition-all duration-200 hover:border-primary hover:shadow-sm hover:-translate-y-0.5`}
    >
      {charImgSrc ? (
        /* eslint-disable @next/next/no-img-element */
        <img src={charImgSrc} alt={reading} className={`${imgHeights[size]} w-auto shrink-0`} />
      ) : (
        <span className={`font-[var(--font-hanja)] ${charSizes[size]} font-bold shrink-0`}>
          {char}
        </span>
      )}
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-sm">{reading}</span>
        {meaning && (
          <span className="text-xs text-text-secondary truncate">{meaning}</span>
        )}
      </div>
    </Link>
  );
}
