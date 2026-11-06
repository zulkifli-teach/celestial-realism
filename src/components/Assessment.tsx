import { useState } from "react";
import { QUESTIONS, checkAnswer } from "@/lib/assessment";

let ctx: AudioContext | null = null;
function play(notes: number[], type: OscillatorType, step: number) {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      const s = t0 + i * step;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.25, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + step * 1.6);
      o.connect(g).connect(ctx!.destination);
      o.start(s);
      o.stop(s + step * 1.7);
    });
  } catch { /* audio unavailable */ }
}
const winSound = () => play([523, 659, 784, 1047], "triangle", 0.12);
const loseSound = () => play([330, 247], "sawtooth", 0.22);

const PRAISE = ["Hebat! Kamu luar biasa!", "Mantap! Pemahamanmu keren!", "Benar sekali! Terus semangat!"];

export function Assessment({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [result, setResult] = useState<null | "right" | "wrong">(null);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUESTIONS[idx] ?? QUESTIONS[0]!;

  const choose = (i: number) => {
    if (result === "right") return;
    if (checkAnswer(q, i)) {
      winSound();
      if (wrong.length === 0) setFirstTry((n) => n + 1);
      setResult("right");
    } else {
      loseSound();
      setWrong((w) => [...w, i]);
      setResult("wrong");
    }
  };
  const next = () => {
    if (idx + 1 >= QUESTIONS.length) return setDone(true);
    setIdx(idx + 1); setWrong([]); setResult(null);
  };
  const restart = () => { setIdx(0); setWrong([]); setResult(null); setFirstTry(0); setDone(false); };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3 pointer-events-auto">
      <div className="glass-panel w-full max-w-xl max-h-full overflow-y-auto rounded-3xl p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold">Asesmen Tata Surya</h2>
            <p className="text-[11px] text-slate-300">Tujuan: menjelaskan sistem tata surya serta kaitannya dengan rotasi dan revolusi Bumi</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 font-bold hover:bg-white/20" aria-label="Tutup asesmen">✕</button>
        </div>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <div className="text-5xl">🏆</div>
            <h3 className="font-display text-2xl font-bold text-amber-300">Selamat, kamu menyelesaikan semua soal!</h3>
            <p className="text-sm text-slate-200">Benar pada percobaan pertama: <b>{firstTry}</b> dari {QUESTIONS.length} soal.</p>
            <p className="text-sm text-slate-300">Setiap kesalahan adalah kesempatan belajar. Terus jelajahi tata surya!</p>
            <button onClick={restart} className="rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500">Ulangi Asesmen</button>
          </div>
        ) : (
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Soal {idx + 1} dari {QUESTIONS.length}</span>
              <div className="h-2 w-32 rounded-full bg-white/10"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${((idx + (result === "right" ? 1 : 0)) / QUESTIONS.length) * 100}%` }} /></div>
            </div>
            <p className="text-base font-bold sm:text-lg">{q.q}</p>
            <div className="grid gap-2">
              {q.options.map((o, i) => {
                const isWrong = wrong.includes(i);
                const isRight = result === "right" && i === q.answer;
                return (
                  <button key={i} disabled={isWrong || result === "right"} onClick={() => choose(i)}
                    className={`min-h-[48px] rounded-xl border px-4 py-2 text-left text-sm font-semibold transition ${isRight ? "border-emerald-400 bg-emerald-500/30" : isWrong ? "border-rose-400/60 bg-rose-500/20 opacity-60 line-through" : "border-white/15 bg-white/5 hover:bg-white/15"}`}>
                    {String.fromCharCode(65 + i)}. {o}
                  </button>
                );
              })}
            </div>
            {result && (
              <div role="status" className={`rounded-2xl border p-4 ${result === "right" ? "border-emerald-400 bg-emerald-500/15" : "border-rose-400 bg-rose-500/15"}`}>
                <div className={`font-display text-xl font-bold ${result === "right" ? "text-emerald-300" : "text-rose-300"}`}>
                  {result === "right" ? `🎉 Benar! ${PRAISE[idx % PRAISE.length]}` : "💪 Coba Lagi! Kamu pasti bisa."}
                </div>
                <p className="mt-1 text-sm text-slate-200">
                  {result === "right" ? q.explain : `Petunjuk: ${q.explain.split(".")[0]}... Pilih jawaban lain untuk soal ini.`}
                </p>
                {result === "right" && (
                  <button onClick={next} className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 font-bold hover:bg-blue-500">
                    {idx + 1 >= QUESTIONS.length ? "Lihat Hasil" : "Soal Berikutnya →"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
