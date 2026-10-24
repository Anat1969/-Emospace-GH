import { describe, expect, it } from 'vitest';
import { DEMO_ANSWERS } from './demo';
import { analyze, vectorOf } from './engine';
import { contrast, kelvinToHex } from './color';
import type { Answers } from './types';

const run = (answers: Answers, area = 100) => analyze({ answers, area, projectType: 'דירת מגורים' }, 0);
const hex = /^#[0-9a-f]{6}$/;

describe('analyze', () => {
  it('is deterministic for the same answers', () => {
    expect(run(DEMO_ANSWERS)).toEqual(run(DEMO_ANSWERS));
  });

  it('produces all eight chapters with valid values', () => {
    const r = run(DEMO_ANSWERS);
    expect(r.color_code.palette).toHaveLength(4);
    r.color_code.palette.forEach((s) => expect(s.hex).toMatch(hex));
    expect(r.color_code.palette.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(r.proportions.ceiling).toBeGreaterThanOrEqual(2.5);
    expect(r.proportions.ceiling).toBeLessThanOrEqual(3.6);
    expect(r.lighting_plan.schedule).toHaveLength(4);
    expect(r.materials_code).toHaveLength(4);
    expect(r.spatial_transitions.length).toBeGreaterThanOrEqual(4);
    expect(r.implementation_timeline.every((p) => p.weeks > 0)).toBe(true);
    expect(r.insights.length).toBeGreaterThanOrEqual(4);
  });

  it('copes with an empty questionnaire', () => {
    const r = run({});
    expect(r.archetype.name).toContain('מאוזן');
    expect(r.color_code.palette.every((s) => hex.test(s.hex))).toBe(true);
    expect(Number.isFinite(r.scene.width)).toBe(true);
  });

  it('raises the ceiling for inspiration and lowers it for intimacy', () => {
    const high = run({ core_emotion: { emotions: ['inspiration', 'freedom'], intensity: 5, arrival: '' }, spatial: { openness: 80, ceiling: 90, curvature: 40, layering: 30, nature: 50, privacy: 20, activities: ['create'] } });
    const low = run({ core_emotion: { emotions: ['intimacy', 'security'], intensity: 5, arrival: '' }, spatial: { openness: 20, ceiling: 10, curvature: 40, layering: 30, nature: 50, privacy: 90, activities: ['read'] } });
    expect(high.proportions.ceiling).toBeGreaterThan(low.proportions.ceiling + 0.5);
    expect(high.insights.some((i) => i.id === 'cathedral')).toBe(true);
    expect(low.scene.refuge).toBeGreaterThan(0.55);
    expect(low.archetype.name.startsWith('מקלט')).toBe(true);
  });

  it('keeps the accent away from avoided palettes', () => {
    const r = run({ ...DEMO_ANSWERS, color: { liked: ['sea'], avoided: ['terracotta', 'ochre'], warmth: 50, saturation: 60 } });
    expect(r.color_code.notes.join(' ')).toContain('טרקוטה');
  });

  it('dims and warms the evening light', () => {
    const r = run(DEMO_ANSWERS);
    const [morning, , evening, night] = r.lighting_plan.schedule;
    expect(morning.kelvin).toBeGreaterThan(evening.kelvin);
    expect(evening.kelvin).toBeGreaterThan(night.kelvin - 1);
    expect(night.lux).toBeLessThan(evening.lux);
  });

  it('turns noise sensitivity into a shorter reverberation target', () => {
    const quiet = run({ soundscape: { level: 10, sources: ['silence'], sensitivity: 95 } });
    const lively = run({ soundscape: { level: 90, sources: ['music'], sensitivity: 5 } });
    expect(parseFloat(quiet.soundscape_strategy.rt60)).toBeLessThan(parseFloat(lively.soundscape_strategy.rt60));
    expect(lively.soundscape_strategy.mix.music).toBeGreaterThan(0.5);
  });

  it('keeps vector values in range', () => {
    const v = vectorOf(DEMO_ANSWERS);
    Object.values(v).forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    });
  });
});

describe('color helpers', () => {
  it('maps kelvin to warm and cool colours', () => {
    const [wr, , wb] = kelvinToHex(2700).match(/\w\w/g)!.map((h) => parseInt(h, 16));
    const [cr, , cb] = kelvinToHex(6500).match(/\w\w/g)!.map((h) => parseInt(h, 16));
    expect(wr).toBeGreaterThan(wb);
    expect(cb).toBeGreaterThan(wb);
    expect(cr).toBeGreaterThan(200);
  });
  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
});
