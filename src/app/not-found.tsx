import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="font-[var(--font-hanja)] text-8xl font-bold text-primary/20 mb-4">
        404
      </div>
      <h1 className="text-xl font-bold mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-text-secondary mb-8">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="bg-primary text-white px-8 py-3 rounded-full text-sm font-semibold
          no-underline transition-all duration-200 hover:bg-primary-dark"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
