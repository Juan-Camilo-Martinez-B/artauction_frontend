export const STEPS = [
  {
    id: 'identidad',
    title: 'Identidad artística',
    questions: [
      {
        key: 'artStyles',
        multiple: true,
        favoriteKey: 'favoriteStyle',
        prompt: '¿Qué estilos artísticos te gustan más?',
        options: [
          ['clasico', 'Arte clásico'],
          ['renacimiento', 'Renacimiento'],
          ['barroco', 'Barroco'],
          ['romanticismo', 'Romanticismo'],
          ['impresionismo', 'Impresionismo'],
          ['postimpresionismo', 'Postimpresionismo'],
          ['moderno', 'Arte moderno'],
          ['contemporaneo', 'Arte contemporáneo'],
          ['minimalismo', 'Minimalismo'],
          ['abstracto', 'Arte abstracto'],
          ['surrealismo', 'Surrealismo'],
          ['digital', 'Arte digital'],
          ['combinacion', 'Una combinación de estilos'],
        ],
      },
      {
        key: 'atmosphere',
        multiple: false,
        prompt: '¿Qué tipo de ambiente artístico te gustaría sentir al entrar en tu galería?',
        options: [
          ['elegante', 'Elegante y clásico'],
          ['sereno', 'Sereno y contemplativo'],
          ['minimalista', 'Moderno y minimalista'],
          ['vanguardista', 'Experimental y vanguardista'],
          ['calido', 'Cálido y acogedor'],
          ['dramatico', 'Dramático y sofisticado'],
          ['futurista', 'Futurista y tecnológico'],
          ['eclectico', 'Ecléctico y creativo'],
        ],
      },
    ],
  },
  {
    id: 'color',
    title: 'Preferencias cromáticas',
    questions: [
      {
        key: 'colorFamily',
        multiple: false,
        prompt: '¿Qué tipo de colores prefieres para tu galería?',
        options: [
          ['claros', 'Tonos claros'],
          ['oscuros', 'Tonos oscuros'],
          ['calidos', 'Tonos cálidos'],
          ['frios', 'Tonos fríos'],
          ['neutros', 'Tonos neutros'],
          ['intensos', 'Colores intensos y contrastados'],
          ['equilibrada', 'Una combinación equilibrada'],
        ],
      },
      {
        key: 'paletteId',
        multiple: false,
        prompt: '¿Qué combinación de colores te resulta más atractiva?',
        options: [
          ['marfil', 'Marfil, arena y madera'],
          ['piedra', 'Blanco, gris y piedra'],
          ['grafito', 'Negro, carbón y grafito'],
          ['terracota', 'Beige, terracota y marrón'],
          ['oliva', 'Verde oliva, crema y madera'],
          ['azul', 'Azul profundo, gris y blanco'],
          ['borgona', 'Borgoña, carbón y dorado'],
          ['personalizada', 'Una paleta personalizada'],
        ],
      },
    ],
  },
  {
    id: 'arquitectura',
    title: 'Arquitectura y distribución',
    questions: [
      {
        key: 'architecture',
        multiple: false,
        prompt: '¿Cómo imaginas el espacio donde expondrás tus obras?',
        options: [
          ['minimal', 'Galería minimalista de paredes lisas'],
          ['museo-clasico', 'Museo clásico con molduras'],
          ['loft', 'Loft industrial'],
          ['hormigon', 'Hormigón y piedra'],
          ['madera', 'Espacio cálido con madera'],
          ['futurista', 'Galería futurista'],
          ['experimental', 'Formas arquitectónicas originales'],
        ],
      },
      {
        key: 'layout',
        multiple: false,
        prompt: '¿Qué tipo de distribución prefieres?',
        options: [
          ['pocas', 'Pocas obras destacadas'],
          ['equilibrada', 'Muchas obras equilibradas'],
          ['abiertos', 'Grandes espacios abiertos'],
          ['habitaciones', 'Habitaciones conectadas'],
          ['intimas', 'Zonas íntimas'],
          ['esculturas', 'Un centro para esculturas'],
          ['combinacion', 'Abierto y contemplativo'],
        ],
      },
      {
        key: 'sculptureRole',
        multiple: false,
        prompt: '¿Qué importancia quieres dar a las esculturas y los objetos tridimensionales?',
        options: [
          ['protagonistas', 'Serán protagonistas'],
          ['igual', 'La misma que las pinturas'],
          ['complementarias', 'Elementos complementarios'],
          ['murales', 'Prefiero obras murales'],
        ],
      },
    ],
  },
  {
    id: 'luz',
    title: 'Iluminación y atmósfera',
    questions: [
      {
        key: 'light',
        multiple: false,
        prompt: '¿Cómo prefieres que esté iluminada tu galería?',
        options: [
          ['natural', 'Luz natural abundante'],
          ['calida', 'Iluminación cálida e íntima'],
          ['neutra', 'Luz neutra de museo'],
          ['blanca', 'Iluminación blanca y moderna'],
          ['dramatica', 'Dramática, con sombras'],
          ['focos', 'Focos dirigidos a cada obra'],
          ['indirecta', 'Luz ambiental indirecta'],
          ['combinada', 'General y focos'],
        ],
      },
      {
        key: 'lightMood',
        multiple: false,
        prompt: '¿Qué ambiente debe transmitir la iluminación?',
        options: [
          ['serenidad', 'Serenidad'],
          ['energia', 'Energía y creatividad'],
          ['misterio', 'Misterio'],
          ['elegancia', 'Elegancia'],
          ['calidez', 'Calidez'],
          ['fidelidad', 'Neutralidad para ver el color real'],
        ],
      },
      {
        key: 'intensity',
        multiple: false,
        prompt: '¿Qué intensidad de iluminación prefieres?',
        options: [
          ['baja', 'Baja'],
          ['media', 'Media'],
          ['alta', 'Alta'],
        ],
      },
    ],
  },
  {
    id: 'materiales',
    title: 'Materiales y detalles',
    questions: [
      {
        key: 'materials',
        multiple: true,
        prompt: '¿Qué materiales te gustaría encontrar en tu galería?',
        options: [
          ['madera', 'Madera natural'],
          ['marmol', 'Mármol o piedra'],
          ['hormigon', 'Hormigón pulido'],
          ['yeso', 'Yeso y superficies lisas'],
          ['metal', 'Metal'],
          ['cristal', 'Cristal'],
          ['artesanal', 'Texturas artesanales'],
          ['combinacion', 'Una combinación'],
        ],
      },
      {
        key: 'sculptureDisplay',
        multiple: false,
        prompt: '¿Cómo prefieres que se exhiban las esculturas y los objetos?',
        options: [
          ['pedestales', 'Pedestales individuales'],
          ['vitrinas', 'Vitrinas'],
          ['plataformas', 'Plataformas bajas'],
          ['nichos', 'Nichos arquitectónicos'],
          ['suelo', 'Directamente sobre el suelo'],
          ['combinacion', 'Una combinación de soportes'],
        ],
      },
    ],
  },
  {
    id: 'experiencia',
    title: 'Experiencia personal',
    questions: [
      {
        key: 'tour',
        multiple: false,
        prompt: '¿Cómo te gustaría recorrer tu galería?',
        options: [
          ['libre', 'Exploración libre'],
          ['guiado', 'Recorrido guiado'],
          ['habitaciones', 'Habitaciones conectadas'],
          ['abiertos', 'Espacios abiertos'],
          ['tematicas', 'Zonas por estilos'],
          ['cronologico', 'Recorrido cronológico'],
        ],
      },
      {
        key: 'approach',
        multiple: false,
        prompt: '¿Qué prefieres que ocurra cuando te acercas a una obra?',
        options: [
          ['ficha', 'Una ficha discreta'],
          ['detallada', 'Una ficha detallada'],
          ['camara', 'Acercar la cámara'],
          ['relacionadas', 'Información y obras relacionadas'],
        ],
      },
      {
        key: 'accessibility',
        multiple: false,
        prompt: '¿Tienes alguna preferencia para facilitar la navegación?',
        options: [
          ['lento', 'Movimiento lento y suave'],
          ['reducir', 'Reducir movimientos de cámara'],
          ['sencillos', 'Controles sencillos'],
          ['contraste', 'Mayor contraste'],
          ['ninguna', 'Ninguna preferencia adicional'],
        ],
      },
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
