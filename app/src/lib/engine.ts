import { ACTIVITIES, DEFAULTS, EMOTIONS, MATERIALS, MEMORIES, PALETTES, byId } from './catalog';
import type { Material } from './catalog';
import { clamp, colorName, hexToHsl, hslToHex, hueDistance, meanHue, pullHue } from './color';
import { INSIGHTS } from './insights';
import type { Analysis, Answers, Insight, Project, SceneParams, Swatch } from './types';

/** The normalised design vector every chapter is derived from (all 0..1). */
export interface Vector {
  arousal: number;
  warmth: number;
  openness: number;
  refuge: number;
  curvature: number;
  nature: number;
  layering: number;
  daylight: number;
  sensitivity: number;
  ceiling: number;
}

const RANK = [1, 0.7, 0.5];
const pct = (v: number) => v / 100;
const round = (v: number, step: number) => Math.round(v / step) * step;
const fill = (a: Answers): Required<Answers> => ({
  core_emotion: { ...DEFAULTS.core_emotion, ...a.core_emotion },
  color: { ...DEFAULTS.color, ...a.color },
  place_memory: { ...DEFAULTS.place_memory, ...a.place_memory },
  soundscape: { ...DEFAULTS.soundscape, ...a.soundscape },
  light: { ...DEFAULTS.light, ...a.light },
  texture: { ...DEFAULTS.texture, ...a.texture },
  spatial: { ...DEFAULTS.spatial, ...a.spatial },
});

function emotionLean(a: Required<Answers>) {
  const picks = a.core_emotion.emotions.map((id) => byId(EMOTIONS, id)).filter((e) => !!e);
  const keys = ['arousal', 'warmth', 'openness', 'refuge', 'curvature', 'ceiling'] as const;
  const lean = Object.fromEntries(keys.map((k) => [k, 0])) as Record<(typeof keys)[number], number>;
  if (!picks.length) return lean;
  const strength = 0.4 + (a.core_emotion.intensity / 5) * 0.6;
  let total = 0;
  picks.forEach((e, i) => {
    const w = RANK[i] ?? 0.4;
    total += w;
    for (const k of keys) lean[k] += e[k] * w;
  });
  for (const k of keys) lean[k] = (lean[k] / total) * strength;
  return lean;
}

/** -1..1 lean to 0..1 */
const unit = (v: number) => (v + 1) / 2;

export function vectorOf(answers: Answers): Vector {
  const a = fill(answers);
  const e = emotionLean(a);
  const sp = a.spatial;
  const mem = byId(MEMORIES, a.place_memory.archetype);
  const mats = a.texture.materials.map((id) => byId(MATERIALS, id)).filter((m): m is Material => !!m);
  const matWarmth = mats.length ? mats.reduce((s, m) => s + m.warmth, 0) / mats.length : 0.3;
  const quiet = a.soundscape.sources.includes('silence') ? 0.15 : 0;
  return {
    arousal: clamp(0.5 + 0.35 * e.arousal + 0.2 * (pct(a.soundscape.level) - 0.5) + 0.15 * (pct(a.color.saturation) - 0.5) - quiet),
    warmth: clamp(0.45 * pct(a.color.warmth) + 0.3 * unit(e.warmth) + 0.25 * unit(matWarmth)),
    openness: clamp(0.6 * pct(sp.openness) + 0.4 * unit(e.openness)),
    refuge: clamp(0.4 * pct(sp.privacy) + 0.25 * (1 - pct(sp.openness)) + 0.35 * unit(e.refuge)),
    curvature: clamp(0.65 * pct(sp.curvature) + 0.35 * unit(e.curvature)),
    nature: clamp(0.65 * pct(sp.nature) + 0.35 * (mem?.nature ?? 0.4)),
    layering: clamp(pct(sp.layering)),
    daylight: clamp(pct(a.light.daylight)),
    sensitivity: clamp(pct(a.soundscape.sensitivity)),
    ceiling: clamp(0.6 * pct(sp.ceiling) + 0.4 * unit(e.ceiling)),
  };
}

export function paletteOf(answers: Answers, v: Vector): Swatch[] {
  const a = fill(answers);
  const hues: { h: number; w: number }[] = [];
  a.color.liked.forEach((id, i) => {
    const p = byId(PALETTES, id);
    if (p) hues.push({ h: hexToHsl(p.colors[1]).h, w: i === 0 ? 1.2 : 0.8 });
  });
  const mem = byId(MEMORIES, a.place_memory.archetype);
  const memPal = mem && byId(PALETTES, mem.palette);
  if (memPal) hues.push({ h: hexToHsl(memPal.colors[1]).h, w: 0.6 });
  a.core_emotion.emotions.forEach((id, i) => {
    const e = byId(EMOTIONS, id);
    if (e) hues.push({ h: e.hue, w: 0.4 * (RANK[i] ?? 0.4) });
  });
  let h = meanHue(hues);
  h = v.warmth >= 0.5 ? pullHue(h, 30, (v.warmth - 0.5) * 0.7) : pullHue(h, 210, (0.5 - v.warmth) * 0.7);
  const s = 0.12 + 0.5 * pct(a.color.saturation) * (0.7 + 0.3 * v.arousal);
  const avoided = a.color.avoided.map((id) => byId(PALETTES, id)).filter((p) => !!p).map((p) => hexToHsl(p.colors[1]).h);
  const dodge = (hue: number) => {
    for (let i = 0; i < 6 && avoided.some((x) => hueDistance(x, hue) < 30); i++) hue = (hue + 40) % 360;
    return hue;
  };
  const accentHue = dodge(v.arousal > 0.55 ? h + 180 : h - 40);
  const secondaryHue = dodge(h + 22);
  const swatch = (role: string, hex: string, share: number): Swatch => ({ role, hex, name: colorName(hex), share });
  return [
    swatch('בסיס — קירות ותקרה', hslToHex({ h, s: s * 0.35, l: 0.9 }), 60),
    swatch('משני — ריהוט גדול וטקסטיל', hslToHex({ h: secondaryHue, s: s * 0.8, l: 0.66 }), 25),
    swatch('הדגשה — נקודות מוקד', hslToHex({ h: accentHue, s: Math.min(0.75, s * 1.5 + 0.1), l: 0.48 }), 10),
    swatch('עוגן — קווים ופרטים כהים', hslToHex({ h, s: s * 0.5, l: 0.2 }), 5),
  ];
}

function rankMaterials(answers: Answers, v: Vector): Material[] {
  const a = fill(answers);
  const mem = byId(MEMORIES, a.place_memory.archetype);
  const target = v.warmth * 2 - 1;
  const score = (m: Material) => {
    const i = a.texture.materials.indexOf(m.id);
    return (
      (i >= 0 ? 1 - i * 0.12 : 0) +
      (mem?.materials.includes(m.id) ? 0.5 : 0) -
      Math.abs(m.warmth - target) * 0.2 -
      Math.abs(m.roughness - pct(a.texture.roughness)) * 0.15 -
      Math.abs(m.softness - pct(a.texture.softness)) * 0.1
    );
  };
  return [...MATERIALS].sort((x, y) => score(y) - score(x) || x.id.localeCompare(y.id));
}

const FLOOR_KIND: Record<string, SceneParams['floorKind']> = { wood: 'wood', stone: 'stone', concrete: 'concrete', ceramic: 'terrazzo' };

function materialsOf(answers: Answers, v: Vector) {
  const ranked = rankMaterials(answers, v);
  const pick = (ids: string[], skip: string[] = []) => ranked.find((m) => ids.includes(m.id) && !skip.includes(m.id))!;
  const floor = pick(['wood', 'stone', 'concrete', 'ceramic']);
  const wall = pick(['stone', 'wood', 'concrete', 'ceramic'], [floor.id]);
  const textile = pick(['linen', 'velvet', 'rattan']);
  const detail = pick(['metal', 'glass', 'ceramic', 'rattan'], [textile.id, wall.id]);
  const why = (m: Material, role: string) =>
    `${role}: ${m.warmth > 0.4 ? 'חומר חם' : m.warmth < 0 ? 'חומר קריר ומאזן' : 'חומר ניטרלי'}` +
    `${m.roughness > 0.55 ? ' עם מרקם מורגש ביד' : ' עם משטח חלק'}${m.softness > 0.6 ? ', רך ומזמין מגע' : ''}.`;
  return {
    list: [
      { role: 'רצפה', name: floor.label, finish: floor.finish, why: why(floor, 'נגיעה ראשונה בכל צעד'), hex: floor.hex },
      { role: 'קיר מוקד', name: wall.label, finish: wall.finish, why: why(wall, 'מעניק עומק ומרקם לקיר המרכזי'), hex: wall.hex },
      { role: 'טקסטיל', name: textile.label, finish: textile.finish, why: why(textile, 'אחראי לתחושת העטיפה'), hex: textile.hex },
      { role: 'פרטים', name: detail.label, finish: detail.finish, why: why(detail, 'נקודות אור והשתקפות'), hex: detail.hex },
    ],
    floor,
    textile,
  };
}

const ADJ: Record<string, string> = {
  calm: 'שקט', warmth: 'חם', inspiration: 'מעורר', security: 'מוגן', freedom: 'פתוח',
  focus: 'ממוקד', joy: 'מואר', intimacy: 'אינטימי', renewal: 'מתחדש',
};

export function analyze(project: Pick<Project, 'answers' | 'area' | 'projectType'>, now = Date.now()): Analysis {
  const answers = project.answers;
  const a = fill(answers);
  const v = vectorOf(answers);
  const palette = paletteOf(answers, v);
  const mats = materialsOf(answers, v);
  const mem = byId(MEMORIES, a.place_memory.archetype);
  const emo = a.core_emotion.emotions.map((id) => byId(EMOTIONS, id)).filter((e) => !!e);
  const top = emo[0];

  // Proportions
  const ceiling = round(2.5 + 1.1 * v.ceiling, 0.05);
  const entryCeiling = round(Math.max(2.2, Math.min(ceiling - 0.35, 2.45)), 0.05);
  const windowToWall = Math.round((0.2 + v.daylight * 0.25) * 100);
  const ratio = v.openness > 0.6 ? '1 : 1.62 (יחס הזהב, מרחב מתמשך)' : v.refuge > 0.6 ? '1 : 1.25 (קרוב לריבוע, עוטף)' : '1 : 1.41 (מאוזן)';

  // Lighting
  const k = a.light.kelvin;
  const morningK = a.light.rhythm === 'evening' ? Math.max(3500, k + 300) : Math.max(4500, k + 1200);
  const eveningK = Math.min(3000, k);
  const nightK = Math.max(1900, Math.min(2400, k - 600));
  const contrastRatio = Math.round(2 + pct(a.light.contrast) * 8);

  // Sound
  const rt = v.sensitivity > 0.65 ? 0.4 : v.sensitivity > 0.35 ? 0.5 : 0.6;
  const level = pct(a.soundscape.level);
  const mix: Record<string, number> = { water: 0, birds: 0, wind: 0, music: 0, city: 0, silence: 0.15 };
  for (const s of a.soundscape.sources) mix[s] = s === 'silence' ? 0.05 : 0.3 + 0.5 * level;
  if (a.soundscape.sources.includes('silence')) for (const key of Object.keys(mix)) mix[key] *= key === 'silence' ? 1 : 0.5;

  const name = `${v.refuge > 0.62 ? 'מקלט' : v.openness > 0.62 ? 'מרחב' : v.curvature > 0.65 ? 'קן' : 'בית'} ${top ? ADJ[top.id] : 'מאוזן'}`;
  const tagline = mem ? `בהשראת ${mem.label}: ${mem.phrase}` : 'מרחב שנבנה מתוך הרגש שבחרתם';

  const axis = (id: keyof Vector, label: string, low: string, high: string) => ({ id, label, low, high, value: Math.round(v[id] * 100) });
  const axes = [
    axis('arousal', 'אנרגיה', 'רוגע', 'עירנות'),
    axis('warmth', 'טמפרטורה', 'קריר', 'חם'),
    axis('openness', 'פתיחות', 'מכונס', 'פתוח'),
    axis('refuge', 'מחסה', 'חשוף', 'מוגן'),
    axis('curvature', 'צורה', 'זוויתי', 'מעוגל'),
    axis('nature', 'טבע', 'עירוני', 'טבעי'),
  ];

  const emoLabels = emo.map((e) => e.label);
  const summary =
    (emoLabels.length ? `הרגש המוביל הוא ${emoLabels.join(', ')}. ` : 'לא נבחר רגש מוביל, ולכן המפה מאוזנת. ') +
    `המרחב צריך להיות ${v.arousal < 0.45 ? 'רגוע ומאט' : v.arousal > 0.6 ? 'ער ומעורר' : 'מאוזן'}, ` +
    `${v.warmth > 0.55 ? 'חם במגע ובגוון' : v.warmth < 0.42 ? 'קריר ובהיר' : 'ניטרלי בטמפרטורה'}, ` +
    `${v.refuge > 0.6 ? 'עם פינות מחסה מוגנות' : v.openness > 0.6 ? 'פתוח ורציף' : 'עם איזון בין פתיחות לפרטיות'}.` +
    (a.core_emotion.arrival ? ` בלשון הלקוח: "${a.core_emotion.arrival}".` : '');

  const insight = (id: string, application: string): Insight => ({ ...INSIGHTS[id], application });
  const insights: Insight[] = [
    insight('memory', mem ? `שפת החומרים נגזרת מ"${mem.label}": ${mem.materials.map((m) => byId(MATERIALS, m)?.label).join(', ')}. החוש המעוגן הוא ${({ smell: 'ריח', sound: 'צליל', touch: 'מגע', light: 'אור' } as Record<string, string>)[a.place_memory.sense] ?? 'אור'}.` : 'כדאי להשלים את פרק הזיכרון כדי לעגן את המרחב בחוויה אישית.'),
    insight('color', `רוויה ${Math.round(hexToHsl(palette[2].hex).s * 100)}% בהדגשה ובהירות 90% בבסיס, בהתאם לרמת אנרגיה ${Math.round(v.arousal * 100)}%.`),
    insight('circadian', `${morningK}K בבוקר, ${eveningK}K בערב ו-${nightK}K בלילה, עם עמעום הדרגתי.`),
  ];
  if (ceiling >= 3) insights.push(insight('cathedral', `תקרה של ${ceiling.toFixed(2)} מ' במרחב המרכזי תומכת בתחושת ההשראה והחופש.`));
  if (ceiling <= 2.65) insights.push(insight('cathedral', `תקרה של ${ceiling.toFixed(2)} מ' תומכת בריכוז ובאינטימיות; אפשר להוסיף נישה גבוהה אחת כמשקל נגד.`));
  if (v.curvature > 0.55) insights.push(insight('curves', 'קצוות מעוגלים בקירות, ברהיטים ובשטיחים; רדיוס פינה מומלץ 30–60 ס"מ בקירות גבס.'));
  if (v.refuge > 0.5) insights.push(insight('prospect', 'מקום ישיבה עם גב לקיר מלא, מבט אל החלון ותקרה מונמכת מעליו.'));
  if (v.nature > 0.5) insights.push(insight('biophilia', `${Math.round(3 + v.nature * 6)} נקודות צמחייה, חומרים טבעיים ומבט פתוח לירוק.`));
  if (v.nature > 0.6 || a.soundscape.sources.includes('water') || a.core_emotion.emotions.includes('calm')) insights.push(insight('restoration', 'נקודת מבט קבועה אל טבע או מים מכל מקום ישיבה מרכזי.'));
  if (v.openness > 0.55) insights.push(insight('compression', `כניסה בגובה ${entryCeiling.toFixed(2)} מ' שנפתחת אל ${ceiling.toFixed(2)} מ' במרחב המרכזי.`));
  if (v.sensitivity > 0.5 || level < 0.4) insights.push(insight('acoustics', `יעד זמן הדהוד ${rt} שניות; משטחים בולעים בתקרה ובטקסטיל.`));
  insights.push(insight('complexity', v.layering > 0.6 ? 'שכבות של חפצים עם סיפור, מאורגנות ברשת מדפים אחידה.' : 'מעט פריטים נבחרים על רקע שקט, עם פרט מורכב אחד כמוקד.'));

  const area = project.area || 90;
  const scale = area > 150 ? 1.5 : area > 80 ? 1.2 : 1;
  const w = (n: number) => Math.max(1, Math.round(n * scale));

  const activities = a.spatial.activities.length ? a.spatial.activities : ['rest'];
  const rooms = activities.map((id) => {
    const act = byId(ACTIVITIES, id)!;
    const mood: Record<string, string> = {
      rest: 'רך, נמוך ועוטף', cook: 'בהיר, חברתי ומזמין', work: 'ממוקד, אור קריר יותר ושקט', read: 'נישה מוגנת עם אור צד חם',
      create: 'גבוה, גמיש ומלא אור', family: 'פתוח וחם עם מקומות ישיבה רבים', sleep: 'חשוך, שקט ובגוונים עמוקים', practice: 'ריק, מרווח ומחובר לטבע',
    };
    const keys: Record<string, string[]> = {
      rest: [mats.textile.label, 'תאורה עקיפה', 'ספה מעוגלת'], cook: ['משטח עבודה בהיר', 'אי מרכזי', 'תאורת משימה 500 לוקס'],
      work: ['שולחן מול חלון בזווית', 'בליעה אקוסטית', `${Math.max(4000, k)}K`], read: ['כורסה עם גב גבוה', 'מנורת קריאה', 'מדף ספרים'],
      create: ['קיר הצמדה', 'אור צפוני', 'משטח עמיד'], family: ['שטיח גדול', 'ישיבה ברצפה', 'אחסון סגור'],
      sleep: ['וילון האפלה', `${nightK}K לילה`, 'בדים טבעיים'], practice: ['רצפת עץ', 'מראה גדולה', 'צמחייה'],
    };
    return { name: act.room, mood: mood[id], keys: keys[id] };
  });

  const scene: SceneParams = {
    ceiling,
    curvature: v.curvature,
    width: round(5 + v.openness * 2.5, 0.1),
    depth: round(4.5 + v.openness * 1.5, 0.1),
    windowRatio: windowToWall / 100,
    wall: palette[0].hex,
    secondary: palette[1].hex,
    accent: palette[2].hex,
    anchor: palette[3].hex,
    floor: mats.floor.hex,
    floorKind: FLOOR_KIND[mats.floor.id] ?? 'wood',
    textile: palette[1].hex,
    kelvinDay: morningK,
    kelvinEvening: eveningK,
    contrast: pct(a.light.contrast),
    nature: v.nature,
    layering: v.layering,
    refuge: v.refuge,
    water: a.soundscape.sources.includes('water') || mem?.id === 'sea',
  };

  return {
    version: 2,
    createdAt: now,
    archetype: { name, tagline },
    emotional_profile: {
      dominant: emo.map((e, i) => ({ id: e.id, label: e.label, weight: RANK[i] ?? 0.4 })),
      axes,
      summary,
      memory: mem ? `${mem.label}${a.place_memory.story ? ` — "${a.place_memory.story}"` : ''}` : '',
    },
    color_code: {
      palette,
      rule: 'חלוקת 60 / 25 / 10 / 5 בין בסיס, משני, הדגשה ועוגן',
      notes: [
        v.arousal > 0.55 ? 'הדגשה משלימה (צד שני של גלגל הצבעים) לאנרגיה ותנועה.' : 'הדגשה אנלוגית (שכנה בגלגל הצבעים) לרצף שקט.',
        `גימור קירות מט או משי בגוון ${palette[0].name}, כדי לפזר את האור באופן רך.`,
        a.color.avoided.length ? `גוונים שהלקוח ביקש להימנע מהם הוסטו מהפלטה: ${a.color.avoided.map((id) => byId(PALETTES, id)?.label).join(', ')}.` : 'לא סומנו גוונים להימנעות.',
      ],
    },
    proportions: {
      ceiling,
      entryCeiling,
      ratio,
      curvature: v.curvature > 0.65 ? 'מעוגל בבירור: קירות קשתיים, רהיטים רכים' : v.curvature > 0.4 ? 'מרוכך: פינות מעוגלות ופרטים רכים' : 'אורתוגונלי: קווים ישרים וחדים',
      windowToWall,
      notes: [
        `גובה תקרה מומלץ במרחב המרכזי: ${ceiling.toFixed(2)} מ'.`,
        `יחס חלון לקיר: כ-${windowToWall}%.`,
        v.refuge > 0.55 ? 'נישה מוגנת בעומק 90 ס"מ לפחות עם תקרה מונמכת ל-2.20 מ\'.' : 'מרחב רציף ללא חלוקות מיותרות.',
      ],
    },
    lighting_plan: {
      schedule: [
        { time: '07:00', kelvin: morningK, lux: a.light.rhythm === 'evening' ? 250 : 500, note: 'הערות: אור קריר ובהיר ליד החלון' },
        { time: '12:00', kelvin: 5500, lux: Math.round(200 + v.daylight * 400), note: 'אור יום טבעי, הצללה גמישה' },
        { time: '19:00', kelvin: eveningK, lux: 150, note: 'מעבר לאור חם בגובה העיניים ומטה' },
        { time: '22:00', kelvin: nightK, lux: 40, note: 'אור לילה נמוך, ללא מקורות מעל הראש' },
      ],
      layers: [
        { layer: 'כללי', detail: v.daylight > 0.6 ? 'תאורה עקיפה רכה כהשלמה לאור היום, 100–150 לוקס' : 'תאורה עקיפה מוגברת בתקרה ובקירות, 150–200 לוקס' },
        { layer: 'משימה', detail: '300–500 לוקס במשטחי עבודה וקריאה, 4000K לכל היותר בשעות היום' },
        { layer: 'הדגשה', detail: `יחס הדגשה של 1:${contrastRatio} על קיר המוקד ועל החומרים` },
        { layer: 'דקורטיבי', detail: v.curvature > 0.5 ? 'גוף תאורה מעוגל וזוהר כמוקד' : 'קו אור לינארי נסתר' },
      ],
      contrastRatio: `1:${contrastRatio}`,
    },
    materials_code: mats.list,
    soundscape_strategy: {
      rt60: `${rt} שניות`,
      nrc: v.sensitivity > 0.6 ? '0.75 ומעלה בתקרה' : '0.6 ומעלה בתקרה',
      masking: a.soundscape.sources.filter((s) => s !== 'silence').map((s) => ({ water: 'מזרקה קטנה או מפל קיר', birds: 'נטיעות מושכות ציפורים מול החלון', wind: 'צמחייה מתנועעת ופתחי אוורור טבעי', music: 'מערכת שמע מפוזרת נסתרת', city: 'חלון פתוח לרחוב שקט' })[s]!),
      actions: [
        'שטיחים ווילונות כבדים להפחתת החזרים',
        v.sensitivity > 0.6 ? 'אטמים בדלתות ובידוד בין חדרי שינה' : 'הפרדה אקוסטית בסיסית לחדרי שינה',
        a.spatial.activities.includes('work') ? 'פאנל בליעה מאחורי עמדת העבודה' : 'מדפי ספרים כמפזרי קול טבעיים',
      ],
      mix,
    },
    spatial_transitions: [
      { step: 'סף', detail: `כניסה מונמכת (${entryCeiling.toFixed(2)} מ'), אור עמום ונקודת הנחה לחפצים — רגע של עצירה.` },
      { step: 'שחרור', detail: `פתיחה אל המרחב המרכזי בגובה ${ceiling.toFixed(2)} מ' ומבט ראשון אל ${v.nature > 0.5 ? 'הירוק' : 'האור'}.` },
      { step: v.refuge > 0.5 ? 'מחסה' : 'רצף', detail: v.refuge > 0.5 ? 'פינה מוגנת עם גב לקיר ומבט אל החלל: הלב השקט של הבית.' : 'מעברים רכים בין אזורים בלי דלתות, מוגדרים באור ובשטיחים.' },
      { step: 'נסיגה', detail: 'החדרים הפרטיים כהים ושקטים יותר, בהדרגה, ככל שמתרחקים מהכניסה.' },
    ],
    implementation_timeline: [
      { phase: 'אימות הממצאים עם הלקוח', weeks: 1, detail: 'שיחת היכרות על המפה, תיקון כיוונים לא מדויקים' },
      { phase: 'תכנון רעיוני', weeks: w(3), detail: 'תוכנית העמדה, חתכים ותרשים מעברים' },
      { phase: 'דוגמאות חומר ואור', weeks: w(2), detail: 'לוח חומרים, בדיקת צבעים בתאורה אמיתית' },
      { phase: 'תכנון מפורט', weeks: w(4), detail: 'פרטים, תאורה, אקוסטיקה וכתב כמויות' },
      { phase: 'ביצוע ופיקוח', weeks: w(10), detail: 'ליווי באתר ובדיקת התאמה לקוד הרגשי' },
      { phase: 'הערכה לאחר אכלוס', weeks: 1, detail: 'מילוי חוזר של השאלון לאחר 3 חודשי מגורים' },
    ],
    rooms,
    insights,
    scene,
  };
}
