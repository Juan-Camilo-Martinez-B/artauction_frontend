'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, artApi } from '@/lib/api/client';
import { STEPS, emptyAnswers, stepComplete, toPreferences, type AnswerMap } from '@/lib/gallery/steps';
import { readAccessToken } from '@/lib/session';

export function PersonalizaForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(emptyAnswers);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = STEPS[step];
  const reviewing = step >= STEPS.length;

  function toggle(key: string, value: string, multiple: boolean) {
    setAnswers((previous): AnswerMap => {
      if (!multiple) {
        return { ...previous, [key]: value };
      }
      const currentValues = Array.isArray(previous[key]) ? previous[key] : [];
      const next = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      const favorite = typeof previous['favoriteStyle'] === 'string' ? previous['favoriteStyle'] : '';
      const favoriteStillValid = next.includes(favorite);
      return {
        ...previous,
        [key]: next,
        favoriteStyle: key === 'artStyles' ? (favoriteStillValid ? favorite : (next[0] ?? '')) : favorite,
      };
    });
  }

  async function generate(random: boolean) {
    const token = readAccessToken();
    if (!token) {
      router.push('/entrar');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await artApi.generateGallery(token, random ? {} : toPreferences(answers), random, false);
      router.push('/mi-galeria');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        const confirmed = window.confirm('Hay cambios manuales en la sala. ¿Quieres reemplazarlos con una propuesta nueva?');
        if (confirmed) {
          await artApi.generateGallery(token, random ? {} : toPreferences(answers), random, true);
          router.push('/mi-galeria');
          return;
        }
      }
      setError(caught instanceof ApiError ? caught.message : 'No se pudo diseñar la galería.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs uppercase tracking-[0.22em] text-oxide">Asistente</p>
      <h1 className="mt-2 font-serif text-5xl">Personaliza tu galería</h1>
      <p className="mt-3 text-muted">Tus respuestas se guardan y la IA las convierte en colores, materiales y luz de tu sala.</p>
      <ol className="mt-6 flex gap-2" aria-label="Progreso">
        {STEPS.map((item, index) => (
          <li key={item.id} className={`h-1 flex-1 ${index <= step ? 'bg-oxide' : 'bg-line'}`} />
        ))}
      </ol>
      {reviewing ? (
        <Review answers={answers} pending={pending} error={error} onBack={() => setStep(STEPS.length - 1)} onGenerate={(random) => void generate(random)} />
      ) : current ? (
        <div className="mt-8">
          <h2 className="font-serif text-3xl">{current.title}</h2>
          {current.questions.map((question) => (
            <fieldset key={question.key} className="mt-6">
              <legend className="font-medium">{question.prompt}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map(([value, label]) => {
                  const stored = answers[question.key];
                  const selected = question.multiple
                    ? Array.isArray(stored) && stored.includes(value)
                    : stored === value;
                  const favorite = question.key === 'artStyles' && answers['favoriteStyle'] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(question.key, value, question.multiple)}
                      className={`rounded-xl border px-4 py-3 text-left ${selected ? 'border-ink bg-white' : 'border-line bg-paper'}`}
                    >
                      <span className="block font-serif text-lg">{label}</span>
                      {favorite ? <span className="text-xs uppercase tracking-wider text-oxide">Preferido</span> : null}
                    </button>
                  );
                })}
              </div>
              {question.key === 'artStyles' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(answers['artStyles']) ? answers['artStyles'] : []).map((style) => (
                    <button
                      key={style}
                      type="button"
                      className="text-sm underline"
                      onClick={() => setAnswers((previous) => ({ ...previous, favoriteStyle: style }))}
                    >
                      Marcar {style} como preferido
                    </button>
                  ))}
                </div>
              ) : null}
            </fieldset>
          ))}
          {current.id === 'color' ? (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers['contrastWithArt'] === true}
                onChange={(event) => setAnswers((previous) => ({ ...previous, contrastWithArt: event.target.checked }))}
              />
              Quiero que los colores del espacio contrasten con las obras
            </label>
          ) : null}
          <div className="mt-8 flex justify-between">
            <button type="button" className="text-sm" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              Anterior
            </button>
            <button
              type="button"
              className="rounded-full bg-ink px-5 py-2 text-paper disabled:opacity-40"
              disabled={!stepComplete(step, answers)}
              onClick={() => setStep((value) => value + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Review({
  answers,
  pending,
  error,
  onBack,
  onGenerate,
}: {
  answers: AnswerMap;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onGenerate: (random: boolean) => void;
}) {
  const rows = [
    ['Estilos', list(answers['artStyles'])],
    ['Paleta', text(answers['paletteId'])],
    ['Arquitectura', text(answers['architecture'])],
    ['Distribución', text(answers['layout'])],
    ['Iluminación', text(answers['light'])],
    ['Materiales', list(answers['materials'])],
    ['Recorrido', text(answers['tour'])],
  ];
  return (
    <div className="mt-8">
      <h2 className="font-serif text-3xl">Resumen</h2>
      <p className="mt-2 text-sm text-muted">La IA usará estas respuestas para proponer una sala concreta. No se aplica nada hasta que el servidor responda.</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white p-4">
            <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-xl">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {error ? <p role="alert" className="mt-4">{error}</p> : null}
      {pending ? <p className="mt-4">Diseñando el espacio según tus preferencias…</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onBack}>Volver a editar</button>
        <button type="button" className="rounded-full bg-ink px-5 py-2 text-paper" disabled={pending} onClick={() => onGenerate(false)}>
          Generar mi galería
        </button>
        <button type="button" className="rounded-full border border-ink px-5 py-2" disabled={pending} onClick={() => onGenerate(true)}>
          Usar una configuración aleatoria
        </button>
      </div>
    </div>
  );
}

function text(value: string | string[] | boolean | undefined): string {
  return typeof value === 'string' ? value : '';
}

function list(value: string | string[] | boolean | undefined): string {
  return Array.isArray(value) ? value.join(', ') : '';
}
