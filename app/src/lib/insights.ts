import type { Insight } from './types';

/** Research-informed design principles. Each is a direction to verify, not a rule. */
export const INSIGHTS: Record<string, Omit<Insight, 'application'>> = {
  cathedral: {
    id: 'cathedral',
    title: 'אפקט הקתדרלה',
    principle: 'תקרה גבוהה נקשרה במחקר לחשיבה מופשטת ותחושת חופש; תקרה נמוכה לחשיבה ממוקדת ופרטנית.',
    source: 'Meyers-Levy & Zhu, Journal of Consumer Research, 2007',
  },
  curves: {
    id: 'curves',
    title: 'קווים מעוגלים',
    principle: 'חללים וצורות מעוגלים נשפטים לרוב כנעימים ומזמינים יותר מצורות זוויתיות חדות.',
    source: 'Bar & Neta, Psychological Science, 2006; Vartanian et al., PNAS, 2013',
  },
  prospect: {
    id: 'prospect',
    title: 'מבט ומחסה',
    principle: 'אנשים נמשכים למקומות שמהם אפשר לראות למרחק (מבט) תוך גב מוגן (מחסה).',
    source: 'Appleton, The Experience of Landscape, 1975; Hildebrand, 1999',
  },
  biophilia: {
    id: 'biophilia',
    title: 'עיצוב ביופילי',
    principle: 'נוכחות של טבע, חומרים טבעיים ותבניות אורגניות קשורה להפחתת לחץ ולשיפור תחושת רווחה.',
    source: 'Kellert, Biophilic Design, 2008; Browning et al., 14 Patterns, 2014',
  },
  restoration: {
    id: 'restoration',
    title: 'שיקום הקשב',
    principle: 'סביבות עם "קסם רך" (נוף, מים, צמחייה) מאפשרות לקשב המכוון להתאושש.',
    source: 'Kaplan & Kaplan, The Experience of Nature, 1989',
  },
  circadian: {
    id: 'circadian',
    title: 'אור ומקצב יממה',
    principle: 'אור קריר ובהיר בבוקר ואור חם ומעומעם בערב תומכים במקצב השינה והערות.',
    source: 'Lucas et al., Trends in Neurosciences, 2014; WELL Building Standard v2',
  },
  compression: {
    id: 'compression',
    title: 'דחיסה ושחרור',
    principle: 'מעבר ממרחב נמוך וצר אל מרחב גבוה ופתוח מעצים את תחושת הפתיחה בכניסה.',
    source: 'Frank Lloyd Wright; Ching, Architecture: Form, Space & Order',
  },
  acoustics: {
    id: 'acoustics',
    title: 'זמן הדהוד',
    principle: 'זמן הדהוד קצר (כחצי שנייה) בחדרי מגורים משפר את בהירות הדיבור ואת תחושת הרוגע.',
    source: 'ISO 3382-2; Hongisto et al., Indoor Air, 2016',
  },
  color: {
    id: 'color',
    title: 'גוון ועוררות',
    principle: 'גוונים רוויים וחמים נוטים לעורר, גוונים מעומעמים וקרירים להרגיע; הבהירות והרוויה משפיעות יותר מהגוון עצמו.',
    source: 'Valdez & Mehrabian, J. Exp. Psychology: General, 1994',
  },
  complexity: {
    id: 'complexity',
    title: 'מורכבות מאוזנת',
    principle: 'מורכבות חזותית בינונית עם סדר ברור נחווית כמעניינת בלי להעמיס.',
    source: 'Berlyne, 1971; Salingaros, Unified Architectural Theory, 2013',
  },
  memory: {
    id: 'memory',
    title: 'זיכרון מקום',
    principle: 'רמזים חושיים ממקומות משמעותיים מהעבר מעוררים תחושת שייכות והמשכיות.',
    source: 'Bachelard, The Poetics of Space, 1958; Pallasmaa, The Eyes of the Skin, 1996',
  },
};
