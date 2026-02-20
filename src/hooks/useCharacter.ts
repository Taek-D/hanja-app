"use client";

import { useState, useEffect } from "react";
import {
  getCharacterByChar,
  getCharacterDetails,
  getPhoneticSiblings,
  getMeaningTree,
} from "@/lib/queries";
import type { CharacterDetail, CharacterDetailInfo, PhoneticSibling, MeaningTreeNode } from "@/types/hanja";

export function useCharacter(char: string) {
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [charDetails, setCharDetails] = useState<CharacterDetailInfo | null>(null);
  const [phoneticRoot, setPhoneticRoot] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<PhoneticSibling[]>([]);
  const [meaningTree, setMeaningTree] = useState<MeaningTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const charData = await getCharacterByChar(char);
        if (cancelled) return;

        if (!charData) {
          setError("한자를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setCharacter(charData);

        // 음 계열 형제, 의미 트리, 세부 내용을 병렬로 불러오기
        const [phoneticData, meaningData, detailData] = await Promise.all([
          getPhoneticSiblings(charData.id),
          getMeaningTree(charData.id),
          getCharacterDetails(char),
        ]);

        if (cancelled) return;

        setPhoneticRoot(phoneticData.phoneticRoot);
        setSiblings(phoneticData.siblings);
        setMeaningTree(meaningData);
        setCharDetails(detailData);
      } catch {
        if (!cancelled) {
          setError("데이터를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [char]);

  return { character, charDetails, phoneticRoot, siblings, meaningTree, loading, error };
}
