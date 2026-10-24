import { analyze } from './engine';
import { createProject, saveAnalysis, updateProject } from './store';
import type { Answers } from './types';

export const DEMO_ANSWERS: Answers = {
  core_emotion: { emotions: ['calm', 'warmth', 'inspiration'], intensity: 4, arrival: 'להוריד את הכתפיים ולנשום עמוק' },
  color: { liked: ['sand', 'sage', 'terracotta'], avoided: ['ink'], warmth: 68, saturation: 38 },
  place_memory: { archetype: 'village', story: 'החצר של סבא בגליל, אור של אחר הצהריים על קיר אבן', sense: 'light' },
  soundscape: { level: 28, sources: ['water', 'birds'], sensitivity: 70 },
  light: { daylight: 85, kelvin: 3000, rhythm: 'morning', contrast: 45 },
  texture: { materials: ['wood', 'linen', 'stone', 'ceramic'], roughness: 55, softness: 70 },
  spatial: { openness: 60, ceiling: 62, curvature: 72, layering: 45, nature: 80, privacy: 62, activities: ['rest', 'read', 'cook', 'family'] },
};

export function loadDemo() {
  const p = createProject({ clientName: 'משפחת אורן (דוגמה)', projectType: 'דירת מגורים', area: 120, budget: '450,000 ₪', dueDate: '', notes: 'פרויקט לדוגמה' });
  updateProject(p.id, { answers: DEMO_ANSWERS, status: 'completed' });
  saveAnalysis(p.id, analyze({ ...p, answers: DEMO_ANSWERS }));
  return p.id;
}
