"use client";

import { ArrowLeftRight, ChevronLeft, Maximize2, Mic, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
import { usePrefs } from "./prefs";

type L = "ru" | "en" | "vi";
const NAMES: Record<L, string> = { ru: "Русский", en: "English", vi: "Tiếng Việt" };
const SHORT: Record<L, string> = { ru: "RU", en: "EN", vi: "VI" };

/** Phrases a waiter needs every shift, in all three languages. */
const PHRASES: Record<L, string>[] = [
  { ru: "Добрый вечер! Вот меню, я подойду через пару минут.", en: "Good evening! Here is the menu, I'll be back in a couple of minutes.", vi: "Chào buổi tối! Đây là thực đơn, em sẽ quay lại sau vài phút ạ." },
  { ru: "Что будете пить?", en: "What would you like to drink?", vi: "Anh chị muốn uống gì ạ?" },
  { ru: "У вас есть аллергия на что-нибудь?", en: "Do you have any allergies?", vi: "Anh chị có bị dị ứng gì không ạ?" },
  { ru: "Это блюдо острое.", en: "This dish is spicy.", vi: "Món này cay ạ." },
  { ru: "Ваш заказ будет готов примерно через 15 минут.", en: "Your order will be ready in about 15 minutes.", vi: "Món của anh chị sẽ có trong khoảng 15 phút ạ." },
  { ru: "Принести счёт?", en: "Shall I bring the bill?", vi: "Em mang hóa đơn ra nhé?" },
  { ru: "Оплата картой, наличными или по QR.", en: "You can pay by card, cash or QR.", vi: "Anh chị có thể thanh toán bằng thẻ, tiền mặt hoặc QR ạ." },
  { ru: "Извините за ожидание.", en: "Sorry for the wait.", vi: "Xin lỗi vì đã để anh chị chờ ạ." },
  { ru: "Всё ли вам понравилось?", en: "Did you enjoy everything?", vi: "Anh chị dùng bữa có ngon miệng không ạ?" },
  { ru: "Спасибо, приходите ещё!", en: "Thank you, come again!", vi: "Cảm ơn anh chị, hẹn gặp lại ạ!" },
  { ru: "Можно мне ещё воды?", en: "Can I have some more water?", vi: "Cho tôi thêm nước được không?" },
  { ru: "Без лука, пожалуйста.", en: "No onion, please.", vi: "Không hành nhé." },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();

/** Demo translation: the phrase book, matched in any language. Live, this is Claude. */
function translate(text: string, to: L): string | null {
  const t = fold(text);
  if (!t) return null;
  const hit = PHRASES.find((p) => (Object.values(p) as string[]).some((v) => fold(v) === t || (t.length > 6 && fold(v).includes(t))));
  return hit ? hit[to] : null;
}

type Line = { id: number; who: "me" | "guest"; text: string; out: string | null; to: L };

/**
 * Live translator: the waiter and the guest take turns. Each line shows what
 * was said small and the translation large; "Show to guest" turns the phone
 * into a big, readable card. Ready-made phrases sit one tap away.
 */
export function LiveTranslator({ onClose }: { onClose: () => void }) {
  const { tr, prefs } = usePrefs();
  const [mine, setMine] = useState<L>(prefs.lang === "vi" ? "vi" : prefs.lang === "en" ? "en" : "ru");
  const [theirs, setTheirs] = useState<L>(prefs.lang === "vi" ? "en" : "vi");
  const [who, setWho] = useState<"me" | "guest">("me");
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState<Line | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lines.length) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  const say = (t: string, from: "me" | "guest" = who) => {
    if (!t.trim()) return;
    haptic("light");
    const to = from === "me" ? theirs : mine;
    setLines((ls) => [...ls, { id: Date.now(), who: from, text: t.trim(), out: translate(t, to), to }]);
    setText("");
  };

  return createPortal(
    <div className="animate-fade fixed inset-0 z-[95] flex flex-col bg-g-bg text-g-ink" role="dialog" aria-label={tr("Live translator")}>
      <ScrollLock />
      <header className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <button onClick={onClose} aria-label={tr("Back")} className="press grid size-11 shrink-0 place-items-center rounded-full bg-g-fill">
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <p className="flex-1 text-center text-[17px] font-semibold">{tr("Live translator")}</p>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      {/* Who speaks which language; the arrows swap them. */}
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-4">
        {(["me", "guest"] as const).map((side, k) => {
          const lang = side === "me" ? mine : theirs;
          const set = side === "me" ? setMine : setTheirs;
          return (
            <span key={side} className="contents">
              {k === 1 && (
                <button
                  aria-label={tr("Swap languages")}
                  onClick={() => {
                    haptic("tick");
                    setMine(theirs);
                    setTheirs(mine);
                  }}
                  className="press grid size-10 shrink-0 place-items-center rounded-full bg-g-fill text-g-blue"
                >
                  <ArrowLeftRight size={17} strokeWidth={2.2} />
                </button>
              )}
              <button
                onClick={() => {
                  haptic("tick");
                  const order: L[] = ["ru", "en", "vi"];
                  set(order[(order.indexOf(lang) + 1) % 3]!);
                }}
                className="press flex h-14 min-w-0 flex-1 flex-col justify-center rounded-[18px] bg-g-fill px-3.5 text-left"
              >
                <span className="text-[11px] font-semibold text-g-muted uppercase">{side === "me" ? tr("You") : tr("Guest")}</span>
                <span className="truncate text-[15px] font-semibold">{NAMES[lang]}</span>
              </button>
            </span>
          );
        })}
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto px-4 pt-4">
        {!lines.length && (
          <>
            <p className="mb-2.5 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("Ready phrases")}</p>
            <div className="grid gap-2">
              {PHRASES.slice(0, 10).map((p) => (
                <button key={p.en} onClick={() => say(p[mine], "me")} className="press rounded-[16px] bg-g-fill px-3.5 py-3 text-left text-[14px] leading-snug">
                  {p[mine]}
                  <span className="mt-0.5 block text-[12.5px] text-g-muted">{p[theirs]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="grid gap-3 pb-4">
          {lines.map((l) => (
            <div key={l.id} className={`max-w-[88%] rounded-[22px] p-3.5 ${l.who === "me" ? "ml-auto bg-g-tint-blue" : "bg-g-fill"}`}>
              <p className="text-[12px] font-semibold text-g-muted">
                {l.who === "me" ? tr("You") : tr("Guest")} · {SHORT[l.who === "me" ? mine : theirs]} → {SHORT[l.to]}
              </p>
              <p className="mt-1 text-[13.5px] text-g-ink-2">{l.text}</p>
              <p className="mt-1.5 text-[19px] leading-snug font-semibold">{l.out ?? tr("The full translator arrives with Yan's connection; for now, pick a ready phrase.")}</p>
              {l.out && l.who === "me" && (
                <button onClick={() => setShown(l)} className="press mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-g-blue">
                  <Maximize2 size={14} strokeWidth={2.4} /> {tr("Show to the guest")}
                </button>
              )}
            </div>
          ))}
          <div ref={end} />
        </div>
      </div>

      {/* Whose turn, then speak or type. */}
      <div className="mx-auto w-full max-w-[480px] px-3 pt-1 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex rounded-full bg-g-fill p-1">
          {(["me", "guest"] as const).map((w) => (
            <button key={w} onClick={() => setWho(w)} aria-pressed={who === w} className={`h-9 flex-1 rounded-full text-[14px] font-semibold ${who === w ? "bg-g-card text-g-ink" : "text-g-muted"}`}>
              {w === "me" ? tr("I speak") : tr("Guest speaks")}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            say(text);
          }}
          className="flex items-center gap-2 rounded-[26px] bg-g-fill p-1.5 pl-4"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Type or hold the mic")} className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-g-faint" />
          {text.trim() ? (
            <button type="submit" aria-label={tr("Translate")} className="blue-grad press grid size-10 shrink-0 place-items-center rounded-full">
              <SendHorizontal size={18} strokeWidth={2.2} />
            </button>
          ) : (
            <button type="button" aria-label={tr("Voice")} onClick={() => haptic("light")} className="blue-grad press grid size-10 shrink-0 place-items-center rounded-full">
              <Mic size={19} strokeWidth={2.2} />
            </button>
          )}
        </form>
      </div>

      {/* The phone turned to the guest: the translation alone, large. */}
      {shown?.out && (
        <div className="animate-fade fixed inset-0 z-[96] flex flex-col bg-g-bg p-6 pt-[max(24px,env(safe-area-inset-top))]">
          <button onClick={() => setShown(null)} aria-label={tr("Close")} className="press grid size-11 place-items-center self-end rounded-full bg-g-fill">
            <X size={20} />
          </button>
          <p className="mt-auto text-[13px] font-semibold tracking-[0.06em] text-g-blue uppercase">{NAMES[shown.to]}</p>
          <p className="mt-2 mb-auto text-[34px] leading-tight font-bold tracking-[-0.02em]">{shown.out}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
