/* A lost link: the sky, one line in three languages, the way back. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 text-g-ink">
      <div className="w-full max-w-[420px] text-center">
        <span className="blue-grad mx-auto grid size-20 place-items-center rounded-full text-[34px] font-bold">?</span>
        <h1 className="mt-6 text-[30px] leading-tight font-bold tracking-[-0.025em]">Page not found</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-g-muted">
          Страница не найдена · Không tìm thấy trang
          <br />
          The link may be old, or the table QR has changed.
        </p>
        <a href="login.html" className="blue-grad press mt-8 flex h-14 items-center justify-center rounded-full text-[16px] font-semibold">
          Back to yanyin
        </a>
      </div>
    </main>
  );
}
