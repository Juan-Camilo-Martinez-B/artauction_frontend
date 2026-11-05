/**
 * Estructura del cuestionario de la galeria: pasos, preguntas y valores que se
 * guardan. Los textos estan en el diccionario GalleryWizard, por identificador.
 */
export const STEPS = [
  {
    id: 'identidad',
    questions: [
      { key: 'artStyles', multiple: true, options: ['clasico', 'renacimiento', 'barroco', 'romanticismo', 'impresionismo', 'postimpresionismo', 'moderno', 'contemporaneo', 'minimalismo', 'abstracto', 'surrealismo', 'digital', 'combinacion'] },
      { key: 'atmosphere', multiple: false, options: ['elegante', 'sereno', 'minimalista', 'vanguardista', 'calido', 'dramatico', 'futurista', 'eclectico'] },
    ],
  },
  {
    id: 'color',
    questions: [
      { key: 'colorFamily', multiple: false, options: ['claros', 'oscuros', 'calidos', 'frios', 'neutros', 'intensos', 'equilibrada'] },
      { key: 'paletteId', multiple: false, options: ['marfil', 'piedra', 'grafito', 'terracota', 'oliva', 'azul', 'borgona', 'personalizada'] },
    ],
  },
  {
    id: 'arquitectura',
    questions: [
      { key: 'architecture', multiple: false, options: ['minimal', 'museo-clasico', 'loft', 'hormigon', 'madera', 'futurista', 'experimental'] },
      { key: 'layout', multiple: false, options: ['pocas', 'equilibrada', 'abiertos', 'habitaciones', 'intimas', 'esculturas', 'combinacion'] },
      { key: 'sculptureRole', multiple: false, options: ['protagonistas', 'igual', 'complementarias', 'murales'] },
    ],
  },
  {
    id: 'luz',
    questions: [
      { key: 'light', multiple: false, options: ['natural', 'calida', 'neutra', 'blanca', 'dramatica', 'focos', 'indirecta', 'combinada'] },
      { key: 'lightMood', multiple: false, options: ['serenidad', 'energia', 'misterio', 'elegancia', 'calidez', 'fidelidad'] },
      { key: 'intensity', multiple: false, options: ['baja', 'media', 'alta'] },
    ],
  },
  {
    id: 'materiales',
    questions: [
      { key: 'materials', multiple: true, options: ['madera', 'marmol', 'hormigon', 'yeso', 'metal', 'cristal', 'artesanal', 'combinacion'] },
      { key: 'sculptureDisplay', multiple: false, options: ['pedestales', 'plataformas', 'nichos', 'suelo', 'combinacion'] },
    ],
  },
  {
    id: 'experiencia',
    questions: [
      { key: 'tour', multiple: false, options: ['libre', 'guiado', 'habitaciones', 'abiertos', 'tematicas', 'cronologico'] },
      { key: 'approach', multiple: false, options: ['ficha', 'detallada', 'camara', 'relacionadas'] },
      { key: 'accessibility', multiple: false, options: ['lento', 'reducir', 'sencillos', 'contraste', 'ninguna'] },
    ],
  },
] as const;

export type AnswerMap = Record<string, string | string[] | boolean>;

export function emptyAnswers(): AnswerMap {
  return { contrastWithArt: false, artStyles: [], materials: [], favoriteStyle: '' };
}

export function stepComplete(stepIndex: number, answers: AnswerMap): boolean {
  const step = STEPS[stepIndex];
  if (!step) {
    return false;
  }
  return step.questions.every((question) => {
    const value = answers[question.key];
    if (question.multiple) {
      return Array.isArray(value) && value.length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  });
}

export function toPreferences(answers: AnswerMap) {
  const styles = Array.isArray(answers['artStyles']) ? answers['artStyles'] : [];
  const favorite = typeof answers['favoriteStyle'] === 'string' ? answers['favoriteStyle'] : styles[0];
  return {
    artStyles: styles,
    favoriteStyle: favorite,
    atmosphere: answers['atmosphere'],
    colorFamily: answers['colorFamily'],
    paletteId: answers['paletteId'],
    contrastWithArt: answers['contrastWithArt'] === true,
    architecture: answers['architecture'],
    layout: answers['layout'],
    sculptureRole: answers['sculptureRole'],
    light: answers['light'],
    lightMood: answers['lightMood'],
    intensity: answers['intensity'],
    materials: Array.isArray(answers['materials']) ? answers['materials'] : [],
    sculptureDisplay: answers['sculptureDisplay'],
    tour: answers['tour'],
    approach: answers['approach'],
    accessibility: answers['accessibility'],
  };
}
