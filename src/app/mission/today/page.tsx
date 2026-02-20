"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface QuizQuestion {
  type: "reading" | "component" | "meaning";
  char: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export default function MissionPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useLocalStorage("hanja-streak", 0);
  const [lastMission, setLastMission] = useLocalStorage("hanja-last-mission", "");

  useEffect(() => {
    async function generateQuestions() {
      try {
        // 음이 있는 랜덤 한자 3개 가져오기
        const { count } = await supabase
          .from("characters")
          .select("*", { count: "exact", head: true });

        if (!count || count < 4) {
          setLoading(false);
          return;
        }

        const qs: QuizQuestion[] = [];

        for (let i = 0; i < 3; i++) {
          const offset = Math.floor(Math.random() * count);
          const { data: chars } = await supabase
            .from("characters")
            .select("id, char, unihan_def, strokes")
            .range(offset, offset + 3)
            .limit(4);

          if (!chars || chars.length < 4) continue;

          const target = chars[0];
          const { data: readings } = await supabase
            .from("readings")
            .select("value")
            .eq("character_id", target.id)
            .eq("is_primary", true)
            .limit(1);

          const targetReading = readings?.[0]?.value || "?";

          // 오답 선택지용 음 가져오기
          const distractorReadings = [];
          for (let j = 1; j < 4; j++) {
            const { data: dr } = await supabase
              .from("readings")
              .select("value")
              .eq("character_id", chars[j].id)
              .eq("is_primary", true)
              .limit(1);
            distractorReadings.push(dr?.[0]?.value || "?");
          }

          if (i === 0) {
            // 음 맞추기 문제
            const options = [targetReading, ...distractorReadings];
            const correctIndex = 0;
            // 선택지 섞기
            const shuffled = shuffleWithAnswer(options, correctIndex);
            qs.push({
              type: "reading",
              char: target.char,
              question: `"${target.char}"의 음은?`,
              options: shuffled.options,
              correctIndex: shuffled.correctIndex,
            });
          } else if (i === 1) {
            // 부품 맞추기 문제
            const { data: decomp } = await supabase
              .from("decompositions")
              .select("components")
              .eq("character_id", target.id)
              .maybeSingle();

            if (decomp?.components?.length) {
              const component = decomp.components[0];
              const fakeComponents = ["口", "木", "火", "水", "金", "土", "日", "月"]
                .filter((c) => !decomp.components.includes(c))
                .slice(0, 3);

              const options = [component, ...fakeComponents];
              const shuffled = shuffleWithAnswer(options, 0);
              qs.push({
                type: "component",
                char: target.char,
                question: `"${target.char}"에 포함된 부분은?`,
                options: shuffled.options,
                correctIndex: shuffled.correctIndex,
              });
            } else {
              // 분해 정보 없으면 음 맞추기로 대체
              const options = [targetReading, ...distractorReadings];
              const shuffled = shuffleWithAnswer(options, 0);
              qs.push({
                type: "reading",
                char: target.char,
                question: `"${target.char}"의 음은?`,
                options: shuffled.options,
                correctIndex: shuffled.correctIndex,
              });
            }
          } else {
            // 뜻 맞추기 문제
            const correctMeaning = target.unihan_def || "unknown";
            const fakeMeanings = chars.slice(1).map((c) => c.unihan_def || "unknown");
            const options = [correctMeaning, ...fakeMeanings];
            const shuffled = shuffleWithAnswer(options, 0);
            qs.push({
              type: "meaning",
              char: target.char,
              question: `"${target.char}" (${targetReading})의 뜻은?`,
              options: shuffled.options,
              correctIndex: shuffled.correctIndex,
            });
          }
        }

        setQuestions(qs);
      } catch {
        // 무시
      }
      setLoading(false);
    }

    generateQuestions();
  }, []);

  const handleSelect = useCallback(
    (index: number) => {
      if (selected !== null) return;
      setSelected(index);

      const isCorrect = index === questions[currentQ].correctIndex;
      if (isCorrect) setScore((s) => s + 1);

      setTimeout(() => {
        if (currentQ < questions.length - 1) {
          setCurrentQ((q) => q + 1);
          setSelected(null);
        } else {
          setFinished(true);
          // 연속 학습일 갱신
          const today = new Date().toISOString().slice(0, 10);
          if (lastMission !== today) {
            setStreak((s) => s + 1);
            setLastMission(today);
          }
        }
      }, 1200);
    },
    [selected, currentQ, questions, lastMission, setStreak, setLastMission]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">미션 준비 중...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5">
        <div className="text-5xl mb-4">&#128533;</div>
        <div className="text-lg font-semibold mb-2">미션을 생성할 수 없습니다.</div>
        <Link
          href="/"
          className="mt-4 bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold no-underline"
        >
          홈으로
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-6xl mb-4">
          {score === questions.length ? "&#127881;" : score >= 2 ? "&#128079;" : "&#128170;"}
        </div>
        <h1 className="text-xl font-bold mb-2">미션 완료!</h1>
        <div className="text-3xl font-bold text-primary mb-2">
          {score} / {questions.length}
        </div>
        <div className="text-sm text-text-secondary mb-6">
          연속 학습: {streak}일
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="bg-surface border border-border px-6 py-2 rounded-full
              text-sm font-semibold no-underline text-text hover:border-primary transition-colors"
          >
            홈으로
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold
              border-none cursor-pointer hover:bg-primary-dark transition-colors"
          >
            다시 도전
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-text-secondary hover:text-primary transition-colors no-underline"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">오늘의 미션</h1>
      </div>

      {/* 진행률 */}
      <div className="px-5 pt-4">
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300
                ${i < currentQ ? "bg-primary" : i === currentQ ? "bg-primary/50" : "bg-border"}`}
            />
          ))}
        </div>
        <div className="text-xs text-text-secondary mt-2">
          {currentQ + 1} / {questions.length}
        </div>
      </div>

      {/* 문제 */}
      <div className="flex-1 px-5 py-8">
        <div className="text-center mb-8">
          <div className="font-[var(--font-hanja)] text-7xl font-bold mb-4">{q.char}</div>
          <h2 className="text-lg font-semibold">{q.question}</h2>
        </div>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let style = "border-border bg-surface";
            if (selected !== null) {
              if (i === q.correctIndex) {
                style = "border-green-500 bg-green-50 text-green-700";
              } else if (i === selected && i !== q.correctIndex) {
                style = "border-red-500 bg-red-50 text-red-700";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`w-full text-left border-2 rounded-xl px-5 py-4
                  font-[var(--font-ui)] text-sm font-medium
                  cursor-pointer transition-all duration-200
                  disabled:cursor-default ${style}
                  ${selected === null ? "hover:border-primary hover:bg-primary-light" : ""}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function shuffleWithAnswer(options: string[], correctIndex: number) {
  const correct = options[correctIndex];
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return {
    options: shuffled,
    correctIndex: shuffled.indexOf(correct),
  };
}
