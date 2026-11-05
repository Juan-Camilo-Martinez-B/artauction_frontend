'use client';

import { ArrowLeft, ArrowRight, Check, Shuffle, Sparkles, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useErrorText } from '@/hooks/use-error-text';
import { ApiError, artApi } from '@/lib/api/client';
import { STEPS, emptyAnswers, stepComplete, toPreferences, type AnswerMap } from '@/lib/gallery/steps';
import { browserSession } from '@/lib/session/browser-session';

/**
 * Etiqueta visible de una respuesta: el cuestionario guarda claves (clasico),
 * no textos. La clave se arma con la pregunta y el valor; una prueba exige que
 * cada combinacion tenga texto en los dos idiomas.
 */
function useAnswerLabel(): (key: string, value: string) => string {
  const t = useTranslations('GalleryWizard.questions') as unknown as { (key: string): string; has(key: string): boolean };
  return (key, value) => {
    const path = `${key}.options.${value}`;
    return t.has(path) ? t(path) : value;
  };
}

export function PersonalizaForm() {
  const t = useTranslations('GalleryWizard');
  return <RequireSession title={t('signInTitle')}>{() => <Wizard />}</RequireSession>;
}

function Wizard() {
  const t = useTranslations('GalleryWizard');
  const errorText = useErrorText();
  const answerLabel = useAnswerLabel();
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
        setError(errorText(caught, t('designFailed')));
      }
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <ol className="flex gap-2" aria-label={t('stepOf', { step: Math.min(step + 1, STEPS.length), total: STEPS.length })}>
        {STEPS.map((item, index) => (
          <li key={item.id} className={`h-1.5 flex-1 rounded-full ${index < step || reviewing ? 'bg-oxide' : index === step ? 'bg-ink' : 'bg-line'}`} />
        ))}
      </ol>
      {reviewing ? (
        <Review answers={answers} pending={pending} error={error} onBack={() => { setStep(STEPS.length - 1); }} onGenerate={(random) => void generate(random)} />
      ) : current ? (
        <div className="mt-8">
          <p className="text-sm text-muted">
            {t('stepOf', { step: step + 1, total: STEPS.length })}
          </p>
          <h2 className="mt-1 font-serif text-3xl">{t(`steps.${current.id}`)}</h2>
          {current.questions.map((question) => (
            <fieldset key={question.key} className="mt-6">
              <legend className="font-medium">
                {t(`questions.${question.key}.prompt`)}
                {question.multiple ? <span className="ml-2 text-sm font-normal text-muted">{t('multiple')}</span> : null}
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((value: string) => {
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
                      <span className="font-serif text-lg">{answerLabel(question.key, value)}</span>
                      <span className="flex items-center gap-1.5">
                        {favorite ? (
                          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-oxide">
                            <Star aria-hidden="true" className="h-3.5 w-3.5" /> {t('favorite')}
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
                  <span className="text-muted">{t('yourFavorite')}</span>
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
              {t('contrast')}
            </label>
          ) : null}
          <div className="mt-8 flex justify-between border-t border-line pt-5">
            <Button variant="secondary" icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} disabled={step === 0} onClick={() => { setStep((value) => value - 1); }}>
              {t('previous')}
            </Button>
            <Button disabled={!stepComplete(step, answers)} onClick={() => { setStep((value) => value + 1); }}>
              {step === STEPS.length - 1 ? t('seeSummary') : t('next')}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={conflict !== null}
        title={t('replaceDialog.title')}
        confirmLabel={t('replaceDialog.confirm')}
        tone="danger"
        onCancel={() => { setConflict(null); }}
        onConfirm={() => {
          const random = conflict?.random ?? false;
          setConflict(null);
          void generate(random, true);
        }}
      >
        {t('replaceDialog.body')}
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
  const t = useTranslations('GalleryWizard');
  const answerLabel = useAnswerLabel();
  const text = (key: string, value: AnswerMap[string] | undefined) => (typeof value === 'string' && value ? answerLabel(key, value) : '');
  const list = (key: string, value: AnswerMap[string] | undefined) => (Array.isArray(value) ? value.map((item) => answerLabel(key, item)).join(', ') : '');
  const rows: Array<[string, string]> = [
    [t('review.styles'), list('artStyles', answers['artStyles'])],
    [t('review.palette'), text('paletteId', answers['paletteId'])],
    [t('review.architecture'), text('architecture', answers['architecture'])],
    [t('review.layout'), text('layout', answers['layout'])],
    [t('review.light'), text('light', answers['light'])],
    [t('review.materials'), list('materials', answers['materials'])],
    [t('review.tour'), text('tour', answers['tour'])],
  ];
  return (
    <div className="mt-8">
      <h2 className="font-serif text-3xl">{t('review.title')}</h2>
      <p className="mt-2 text-sm text-muted">{t('review.hint')}</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-panel border border-line bg-surface p-4">
            <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-xl">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}
      {pending ? <Notice className="mt-4">{t('review.designing')}</Notice> : null}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
        <Button variant="secondary" icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} disabled={pending} onClick={onBack}>
          {t('review.back')}
        </Button>
        <Button loading={pending} icon={<Sparkles aria-hidden="true" className="h-4 w-4" />} onClick={() => { onGenerate(false); }}>
          {t('review.generate')}
        </Button>
        <Button variant="ghost" disabled={pending} icon={<Shuffle aria-hidden="true" className="h-4 w-4" />} onClick={() => { onGenerate(true); }}>
          {t('review.surprise')}
        </Button>
      </div>
    </div>
  );
}

