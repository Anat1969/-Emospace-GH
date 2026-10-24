import type { Answers, ModuleId } from './types';

/** Each emotion leans the design vector. Values are -1..1 nudges. */
export interface Emotion {
  id: string;
  label: string;
  glyph: string;
  hue: number;
  arousal: number;
  warmth: number;
  openness: number;
  refuge: number;
  curvature: number;
  ceiling: number;
}

export const EMOTIONS: Emotion[] = [
  { id: 'calm', label: 'שלווה', glyph: '◌', hue: 190, arousal: -0.8, warmth: 0, openness: 0.2, refuge: 0.3, curvature: 0.6, ceiling: 0 },
  { id: 'warmth', label: 'חום ועטיפה', glyph: '◐', hue: 25, arousal: -0.3, warmth: 0.9, openness: -0.3, refuge: 0.7, curvature: 0.5, ceiling: -0.3 },
  { id: 'inspiration', label: 'השראה', glyph: '✦', hue: 265, arousal: 0.5, warmth: 0.1, openness: 0.7, refuge: -0.2, curvature: 0.2, ceiling: 0.9 },
  { id: 'security', label: 'ביטחון', glyph: '▣', hue: 30, arousal: -0.4, warmth: 0.5, openness: -0.5, refuge: 0.9, curvature: 0.1, ceiling: -0.4 },
  { id: 'freedom', label: 'חופש', glyph: '◇', hue: 200, arousal: 0.4, warmth: -0.2, openness: 1, refuge: -0.6, curvature: 0.3, ceiling: 0.8 },
  { id: 'focus', label: 'ריכוז', glyph: '◎', hue: 150, arousal: 0.1, warmth: -0.2, openness: -0.3, refuge: 0.5, curvature: -0.4, ceiling: -0.6 },
  { id: 'joy', label: 'שמחה', glyph: '☀', hue: 45, arousal: 0.8, warmth: 0.6, openness: 0.6, refuge: -0.2, curvature: 0.5, ceiling: 0.3 },
  { id: 'intimacy', label: 'אינטימיות', glyph: '❍', hue: 340, arousal: -0.4, warmth: 0.8, openness: -0.7, refuge: 0.8, curvature: 0.7, ceiling: -0.5 },
  { id: 'renewal', label: 'התחדשות', glyph: '❦', hue: 110, arousal: 0.2, warmth: 0.1, openness: 0.5, refuge: 0, curvature: 0.6, ceiling: 0.3 },
];

export interface PaletteSwatch { id: string; label: string; colors: string[] }

export const PALETTES: PaletteSwatch[] = [
  { id: 'sand', label: 'חול ואבן', colors: ['#e8dccb', '#c9b394', '#8a7357'] },
  { id: 'terracotta', label: 'טרקוטה', colors: ['#f0d9c8', '#c8734f', '#7a3b25'] },
  { id: 'sage', label: 'מרווה', colors: ['#e3e8dc', '#9fae8e', '#4f6146'] },
  { id: 'sea', label: 'ים תיכון', colors: ['#e2eef2', '#6fa3b8', '#20516a'] },
  { id: 'dusk', label: 'דמדומים', colors: ['#ece2ee', '#a58bb3', '#4b3a5e'] },
  { id: 'ochre', label: 'אוכרה', colors: ['#f4e7c5', '#d9a53f', '#7d5a17'] },
  { id: 'blush', label: 'ורוד אבקתי', colors: ['#f6e4e1', '#d69a95', '#87494a'] },
  { id: 'ink', label: 'דיו ופחם', colors: ['#e6e6e3', '#7d8288', '#25292e'] },
  { id: 'forest', label: 'יער עמוק', colors: ['#dfe6dd', '#5f7d62', '#1f3a2a'] },
];

export interface MemoryArchetype {
  id: string;
  label: string;
  image: string;
  palette: string;
  materials: string[];
  sound: string;
  nature: number;
  phrase: string;
}

export const MEMORIES: MemoryArchetype[] = [
  { id: 'grandma', label: 'הבית של סבתא', image: '🫖', palette: 'terracotta', materials: ['wood', 'velvet', 'ceramic'], sound: 'music', nature: 0.3, phrase: 'זיכרון של עטיפה, ריח של בישול ושכבות של חפצים עם סיפור' },
  { id: 'sea', label: 'חוף ים', image: '🌊', palette: 'sea', materials: ['linen', 'stone', 'rattan'], sound: 'water', nature: 0.5, phrase: 'אופק פתוח, אור מוחזר ומלח באוויר' },
  { id: 'forest', label: 'יער', image: '🌲', palette: 'forest', materials: ['wood', 'stone', 'linen'], sound: 'birds', nature: 1, phrase: 'אור מסונן בין עלים, ריח אדמה ותחושת מחסה' },
  { id: 'village', label: 'כפר ים תיכוני', image: '🏘️', palette: 'sand', materials: ['stone', 'ceramic', 'wood'], sound: 'birds', nature: 0.6, phrase: 'קירות עבים, צל קריר בצהריים וחצר פנימית' },
  { id: 'desert', label: 'מדבר', image: '🏜️', palette: 'ochre', materials: ['stone', 'concrete', 'linen'], sound: 'wind', nature: 0.2, phrase: 'שקט רחב, אור חד ועומק של מרחק' },
  { id: 'city', label: 'עיר אירופית', image: '🏛️', palette: 'ink', materials: ['stone', 'metal', 'velvet'], sound: 'city', nature: 0.2, phrase: 'תקרות גבוהות, חלונות צרים וארוכים ומרקם היסטורי' },
  { id: 'studio', label: 'סטודיו אורבני', image: '🏙️', palette: 'ink', materials: ['concrete', 'metal', 'glass'], sound: 'city', nature: 0.1, phrase: 'מרחב גולמי פתוח, אור תעשייתי ואנרגיה של יצירה' },
  { id: 'garden', label: 'גינה פורחת', image: '🌸', palette: 'blush', materials: ['ceramic', 'rattan', 'linen'], sound: 'birds', nature: 0.9, phrase: 'צבע עונתי, ריח פריחה ומעבר רך בין פנים לחוץ' },
];

export const SENSES = [
  { id: 'smell', label: 'ריח' },
  { id: 'sound', label: 'צליל' },
  { id: 'touch', label: 'מגע' },
  { id: 'light', label: 'אור' },
];

export const SOUND_SOURCES = [
  { id: 'water', label: 'מים זורמים' },
  { id: 'birds', label: 'ציפורים' },
  { id: 'wind', label: 'רוח בעלים' },
  { id: 'music', label: 'מוזיקה רכה' },
  { id: 'city', label: 'רחש עיר רחוק' },
  { id: 'silence', label: 'שקט מוחלט' },
];

export interface Material {
  id: string;
  label: string;
  hex: string;
  warmth: number;
  roughness: number;
  softness: number;
  finish: string;
}

export const MATERIALS: Material[] = [
  { id: 'wood', label: 'עץ', hex: '#a87b52', warmth: 0.9, roughness: 0.5, softness: 0.3, finish: 'עץ אלון בגימור שמן מט' },
  { id: 'stone', label: 'אבן טבעית', hex: '#c9bfae', warmth: 0.3, roughness: 0.7, softness: 0, finish: 'אבן גיר מוברשת' },
  { id: 'concrete', label: 'בטון', hex: '#a3a19c', warmth: -0.3, roughness: 0.6, softness: 0, finish: 'בטון מוחלק בגוון חם' },
  { id: 'linen', label: 'פשתן', hex: '#ddd3c2', warmth: 0.5, roughness: 0.6, softness: 0.9, finish: 'פשתן כבוס טבעי' },
  { id: 'velvet', label: 'קטיפה', hex: '#6b4b5c', warmth: 0.8, roughness: 0.2, softness: 1, finish: 'קטיפת כותנה עמוקה' },
  { id: 'metal', label: 'מתכת', hex: '#8f8a80', warmth: -0.5, roughness: 0.2, softness: 0, finish: 'פליז מוברש או פלדה שחורה' },
  { id: 'ceramic', label: 'קרמיקה', hex: '#c98f6e', warmth: 0.6, roughness: 0.4, softness: 0.1, finish: 'אריחי קרמיקה בעבודת יד' },
  { id: 'rattan', label: 'ראטן וקש', hex: '#c4a26c', warmth: 0.7, roughness: 0.8, softness: 0.3, finish: 'קליעת ראטן טבעית' },
  { id: 'glass', label: 'זכוכית', hex: '#c8d6d8', warmth: -0.4, roughness: 0, softness: 0, finish: 'זכוכית מחוסמת או מחורצת' },
];

export const ACTIVITIES = [
  { id: 'rest', label: 'מנוחה', room: 'סלון מנוחה' },
  { id: 'cook', label: 'בישול ואירוח', room: 'מטבח ופינת אוכל' },
  { id: 'work', label: 'עבודה מהבית', room: 'פינת עבודה' },
  { id: 'read', label: 'קריאה', room: 'נישת קריאה' },
  { id: 'create', label: 'יצירה', room: 'סטודיו ביתי' },
  { id: 'family', label: 'זמן משפחה', room: 'מרחב משפחתי' },
  { id: 'sleep', label: 'שינה עמוקה', room: 'חדר שינה' },
  { id: 'practice', label: 'תנועה ויוגה', room: 'פינת תנועה' },
];

export const PROJECT_TYPES = ['דירת מגורים', 'בית פרטי', 'פנטהאוז', 'משרד', 'קליניקה', 'חלל מסחרי', 'מוסד ציבורי'];

export interface ModuleDef { id: ModuleId; index: number; title: string; question: string; hint: string }

export const MODULES: ModuleDef[] = [
  { id: 'core_emotion', index: 1, title: 'רגש ליבה', question: 'מה תרצו להרגיש ברגע שאתם נכנסים הביתה?', hint: 'בחרו עד שלושה רגשות. הסדר קובע את המשקל.' },
  { id: 'color', index: 2, title: 'צבע', question: 'אילו צבעים מרגישים לכם כמו בית?', hint: 'סמנו פלטות שאתם אוהבים, ולחיצה שנייה מסמנת צבע שתרצו להימנע ממנו.' },
  { id: 'place_memory', index: 3, title: 'זיכרון מקום', question: 'איזה מקום מהעבר מעורר בכם תחושת בית?', hint: 'הזיכרון הוא המפתח החזק ביותר לשפה החומרית של המרחב.' },
  { id: 'soundscape', index: 4, title: 'נוף קולי', question: 'איך נשמע הבית האידיאלי שלכם?', hint: 'אפשר להקשיב לכל מקור קול לפני הבחירה.' },
  { id: 'light', index: 5, title: 'אור', question: 'באיזה אור אתם מרגישים הכי טוב?', hint: 'הזיזו את המחוון וראו את גוון האור משתנה.' },
  { id: 'texture', index: 6, title: 'מרקם', question: 'מה הייתם רוצים להרגיש מתחת לכף היד?', hint: 'בחרו חומרים שמושכים אתכם למגע.' },
  { id: 'spatial', index: 7, title: 'העדפות מרחב', question: 'איך המרחב צריך לעטוף אתכם?', hint: 'אין תשובה נכונה; כל מחוון הוא רצף.' },
];

export const DEFAULTS: Required<Answers> = {
  core_emotion: { emotions: [], intensity: 3, arrival: '' },
  color: { liked: [], avoided: [], warmth: 55, saturation: 40 },
  place_memory: { archetype: '', story: '', sense: 'light' },
  soundscape: { level: 30, sources: [], sensitivity: 50 },
  light: { daylight: 70, kelvin: 3200, rhythm: 'both', contrast: 40 },
  texture: { materials: [], roughness: 50, softness: 60 },
  spatial: { openness: 55, ceiling: 50, curvature: 50, layering: 40, nature: 60, privacy: 50, activities: [] },
};

/** A module counts as answered once its required choice is made. */
export function isModuleDone(id: ModuleId, a: Answers): boolean {
  switch (id) {
    case 'core_emotion': return (a.core_emotion?.emotions.length ?? 0) > 0;
    case 'color': return (a.color?.liked.length ?? 0) > 0;
    case 'place_memory': return !!a.place_memory?.archetype;
    case 'soundscape': return (a.soundscape?.sources.length ?? 0) > 0;
    case 'light': return !!a.light;
    case 'texture': return (a.texture?.materials.length ?? 0) > 0;
    case 'spatial': return (a.spatial?.activities.length ?? 0) > 0;
  }
}

export const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id);
