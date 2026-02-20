"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Goal = "culture" | "grade";
type Time = 5 | 10 | 15;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [time, setTime] = useState<Time | null>(null);
  const [, setPrefs] = useLocalStorage("hanja-prefs", {});

  const handleComplete = () => {
    setPrefs({ goal, studyMinutes: time, onboarded: true });
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300
                ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 py-8">
        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <h1 className="text-xl font-bold mb-2">학습 목표를 선택하세요</h1>
            <p className="text-sm text-text-secondary mb-8">
              맞춤 학습 경로를 추천해드립니다.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => { setGoal("culture"); setStep(1); }}
                className={`w-full text-left bg-surface border-2 rounded-xl p-5
                  transition-all duration-200 cursor-pointer
                  ${goal === "culture" ? "border-primary" : "border-border hover:border-primary/50"}`}
              >
                <div className="text-2xl mb-2">&#128218;</div>
                <div className="font-semibold">교양으로서의 한문</div>
                <div className="text-sm text-text-secondary mt-1">
                  한자의 구조와 의미 변화를 통해 동아시아 문화를 이해합니다.
                </div>
              </button>

              <button
                onClick={() => { setGoal("grade"); setStep(1); }}
                className={`w-full text-left bg-surface border-2 rounded-xl p-5
                  transition-all duration-200 cursor-pointer
                  ${goal === "grade" ? "border-primary" : "border-border hover:border-primary/50"}`}
              >
                <div className="text-2xl mb-2">&#127942;</div>
                <div className="font-semibold">급수 보조 학습</div>
                <div className="text-sm text-text-secondary mt-1">
                  한자능력검정시험 준비에 도움이 되는 체계적 학습입니다.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Time */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <h1 className="text-xl font-bold mb-2">하루 학습 시간은?</h1>
            <p className="text-sm text-text-secondary mb-8">
              짧은 시간도 꾸준히 하면 효과적입니다.
            </p>

            <div className="space-y-3">
              {([5, 10, 15] as Time[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTime(t); setStep(2); }}
                  className={`w-full text-left bg-surface border-2 rounded-xl p-5
                    transition-all duration-200 cursor-pointer
                    ${time === t ? "border-primary" : "border-border hover:border-primary/50"}`}
                >
                  <div className="font-semibold">{t}분</div>
                  <div className="text-sm text-text-secondary mt-1">
                    {t === 5 && "하루 2~3글자, 가볍게 시작"}
                    {t === 10 && "하루 4~5글자, 균형 잡힌 학습"}
                    {t === 15 && "하루 6~8글자, 빠른 진도"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease] text-center py-10">
            <div className="text-6xl mb-4">&#127881;</div>
            <h1 className="text-xl font-bold mb-2">준비 완료!</h1>
            <p className="text-sm text-text-secondary mb-8">
              {goal === "culture" ? "교양 한문" : "급수 보조"} 모드로
              하루 {time}분 학습을 시작합니다.
            </p>

            <button
              onClick={handleComplete}
              className="bg-primary text-white px-8 py-3 rounded-full text-sm font-semibold
                cursor-pointer transition-all duration-200 hover:bg-primary-dark border-none"
            >
              학습 시작하기
            </button>

            <button
              onClick={handleComplete}
              className="block mx-auto mt-4 text-sm text-text-secondary bg-transparent border-none
                cursor-pointer hover:text-primary transition-colors"
            >
              로그인 없이 둘러보기
            </button>
          </div>
        )}
      </div>

      {/* Back button */}
      {step > 0 && (
        <div className="px-5 pb-8">
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm text-text-secondary bg-transparent border-none
              cursor-pointer hover:text-primary transition-colors"
          >
            &#8592; 이전
          </button>
        </div>
      )}
    </div>
  );
}
