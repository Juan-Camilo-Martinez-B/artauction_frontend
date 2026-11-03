'use client';

import { ArrowLeft, ArrowRight, Check, Shuffle, Sparkles, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { ApiError, artApi } from '@/lib/api/client';
import { STEPS, emptyAnswers, stepComplete, toPreferences, type AnswerMap } from '@/lib/gallery/steps';
import { browserSession } from '@/lib/session/browser-session';

/** Etiqueta visible de una respuesta: el cuestionario guarda claves (clasico), no textos. */
export function answerLabel(key: string, value: string): string {
  for (const step of STEPS) {
    for (const question of step.questions) {
      if (question.key === key) {
        const option = question.options.find(([optionValue]) => optionValue === value);
        if (option) {
          return option[1];
        }
      }
    }
  }
  return value;
}

export function PersonalizaForm() {
  return (
    <RequireSession title="Entra para diseñar tu galería">{() => <Wizard />}</RequireSession>
  );
}

function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(emptyAnswers);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ random: boolean } | null>(null);
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

  async function generate(random: boolean, replace = false) {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await artApi.generateGallery(token, random ? {} : toPreferences(answers), random, replace);
      router.push('/mi-galeria');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && !replace) {
        // La sala tiene cambios manuales: se pregunta antes de reemplazarlos.
        setConflict({ random });
      } else {
        setError(caught instanceof ApiError ? caught.message : 'No se pudo diseñar la galería.');
      }
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Asistente"
        title="Diseña tu galería"
        description="Responde unas preguntas y el asistente propone paredes, suelo, luz y recorrido para tu sala."
      />
      <ol className="flex gap-2" aria-label={`Paso ${String(Math.min(step + 1, STEPS.length))} de ${String(STEPS.length)}`}>
        {STEPS.map((item, index) => (
          <li key={item.id} className={`h-1.5 flex-1 rounded-full ${index < step || reviewing ? 'bg-oxide' : index === step ? 'bg-ink' : 'bg-line'}`} />
        ))}
      </ol>
      {reviewing ? (
        <Review answers={answers} pending={pending} error={error} onBack={() => { setStep(STEPS.length - 1); }} onGenerate={(random) => void generate(random)} />
      ) : current ? (
        <div className="mt-8">
          <p className="text-sm text-muted">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h2 className="mt-1 font-serif text-3xl">{current.title}</h2>
          {current.questions.map((question) => (
            <fieldset key={question.key} className="mt-6">
              <legend className="font-medium">
                {question.prompt}
                {question.multiple ? <span className="ml-2 text-sm font-normal text-muted">Puedes elegir varias.</span> : null}
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map(([value, label]) => {
                  const stored = answers[question.key];
                  const selected = question.multiple ? Array.isArray(stored) && stored.includes(value) : stored === value;
                  const favorite = question.key === 'artStyles' && answers['favoriteStyle'] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { toggle(question.key, value, question.multiple); }}
                      className={`flex items-center justify-between gap-3 rounded-field border px-4 py-3 text-left transition-colors ${
                        selected ? 'border-ink bg-surface shadow-panel' : 'border-line bg-paper hover:border-line-strong'
                      }`}
                    >
                      <span className="font-serif text-lg">{label}</span>
                      <span className="flex items-center gap-1.5">
                        {favorite ? (
                          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-oxide">
                            <Star aria-hidden="true" className="h-3.5 w-3.5" /> Preferido
                          </span>
                        ) : null}
                        {selected ? <Check aria-hidden="true" className="h-4 w-4 text-ink" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              {question.key === 'artStyles' && Array.isArray(answers['artStyles']) && answers['artStyles'].length > 1 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Tu preferido:</span>
                  {answers['artStyles'].map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={answers['favoriteStyle'] === style}
                      className={`rounded-full border px-3 py-1 ${answers['favoriteStyle'] === style ? 'border-oxide bg-oxide-tint text-oxide' : 'border-line hover:border-line-strong'}`}
                      onClick={() => { setAnswers((previous) => ({ ...previous, favoriteStyle: style })); }}
                    >
                      {answerLabel('artStyles', style)}
                    </button>
                  ))}
                </div>
              ) : null}
            </fieldset>
          ))}
          {current.id === 'color' ? (
            <label className="mt-5 flex items-center gap-3 rounded-field border border-line bg-paper px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-oxide"
                checked={answers['contrastWithArt'] === true}
                onChange={(event) => { setAnswers((previous) => ({ ...previous, contrastWithArt: event.target.checked })); }}
              />
              Quiero que los colores del espacio contrasten con las obras
            </label>
          ) : null}
          <div className="mt-8 flex justify-between border-t border-line pt-5">
            <Button variant="secondary" icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} disabled={step === 0} onClick={() => { setStep((value) => value - 1); }}>
              Anterior
            </Button>
            <Button disabled={!stepComplete(step, answers)} onClick={() => { setStep((value) => value + 1); }}>
              {step === STEPS.length - 1 ? 'Ver resumen' : 'Siguiente'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={conflict !== null}
        title="¿Reemplazar tu sala?"
        confirmLabel="Reemplazar"
        tone="danger"
        onCancel={() => { setConflict(null); }}
        onConfirm={() => {
          const random = conflict?.random ?? false;
          setConflict(null);
          void generate(random, true);
        }}
      >
        Hiciste cambios a mano en tu sala. La propuesta nueva los reemplaza; las obras colgadas no cambian.
      </ConfirmDialog>
    </div>
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
  const rows: Array<[string, string]> = [
    ['Estilos', list('artStyles', answers['artStyles'])],
    ['Paleta', text('paletteId', answers['paletteId'])],
    ['Arquitectura', text('architecture', answers['architecture'])],
    ['Distribución', text('layout', answers['layout'])],
    ['Iluminación', text('light', answers['light'])],
    ['Materiales', list('materials', answers['materials'])],
    ['Recorrido', text('tour', answers['tour'])],
  ];
  return (
    <div className="mt-8">
      <h2 className="font-serif text-3xl">Resumen</h2>
      <p className="mt-2 text-sm text-muted">El asistente usará estas respuestas para proponer tu sala. Nada se aplica hasta que la propuesta esté lista.</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-panel border border-line bg-surface p-4">
            <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-xl">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}
      {pending ? <Notice className="mt-4">Diseñando el espacio según tus preferencias…</Notice> : null}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
        <Button variant="secondary" icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} disabled={pending} onClick={onBack}>
          Volver a editar
        </Button>
        <Button loading={pending} icon={<Sparkles aria-hidden="true" className="h-4 w-4" />} onClick={() => { onGenerate(false); }}>
          Generar mi galería
        </Button>
        <Button variant="ghost" disabled={pending} icon={<Shuffle aria-hidden="true" className="h-4 w-4" />} onClick={() => { onGenerate(true); }}>
          Sorpréndeme
        </Button>
      </div>
    </div>
  );
}

function text(key: string, value: string | string[] | boolean | undefined): string {
  return typeof value === 'string' && value ? answerLabel(key, value) : '';
}

function list(key: string, value: string | string[] | boolean | undefined): string {
  return Array.isArray(value) ? value.map((item) => answerLabel(key, item)).join(', ') : '';
}
