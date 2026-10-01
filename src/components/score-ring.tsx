export function ScoreRing({ score, verdict }: { score: number | null; verdict: string | null }) {
  const value = score ?? 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <figure className="flex items-center gap-5 rounded-xl border border-line bg-white p-4">
      <svg viewBox="0 0 140 140" className="h-28 w-28" role="img" aria-label={score === null ? 'Puntaje de autenticidad sin dato' : `Puntaje de autenticidad ${String(score)}`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#d8d0c2" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={value < 40 ? '#7a2e24' : '#1e5c40'}
          strokeWidth="10"
          strokeDasharray={`${String(dash)} ${String(circumference - dash)}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="78" textAnchor="middle" fill="#1b1814" fontSize="28" fontFamily="Georgia, serif">
          {score ?? '—'}
        </text>
      </svg>
      <figcaption>
        <p className="font-serif text-2xl">Autenticidad</p>
        <p className="text-sm text-muted">{verdict ?? 'Todavía sin veredicto'}</p>
      </figcaption>
    </figure>
  );
}
