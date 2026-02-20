// 간단한 SRS (간격 반복 학습) 복습 간격 계산

const INTERVALS = [1, 3, 7, 14, 30, 60, 120]; // 일 단위

export function getNextInterval(correctCount: number, wrongCount: number): number {
  const netCorrect = Math.max(0, correctCount - wrongCount);
  const index = Math.min(netCorrect, INTERVALS.length - 1);
  return INTERVALS[index];
}

export function getNextReviewDate(correctCount: number, wrongCount: number): Date {
  const intervalDays = getNextInterval(correctCount, wrongCount);
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  return next;
}

export function isReviewDue(nextReviewAt: string | null): boolean {
  if (!nextReviewAt) return true;
  return new Date(nextReviewAt) <= new Date();
}
