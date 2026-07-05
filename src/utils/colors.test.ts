import { describe, expect, it } from 'vitest';
import { getDifficultyColor, getSuccessColor } from './colors';

describe('getDifficultyColor', () => {
  it('returns green for Easy', () => {
    expect(getDifficultyColor('Easy')).toBe('#22c55e');
  });

  it('returns amber for Medium', () => {
    expect(getDifficultyColor('Medium')).toBe('#f59e0b');
  });

  it('returns orange for Hard', () => {
    expect(getDifficultyColor('Hard')).toBe('#d97706');
  });

  it('returns red for Extreme', () => {
    expect(getDifficultyColor('Extreme')).toBe('#ef4444');
  });
});

describe('getSuccessColor', () => {
  it('returns green at or above 0.8', () => {
    expect(getSuccessColor(0.8)).toBe('#22c55e');
    expect(getSuccessColor(1)).toBe('#22c55e');
  });

  it('returns amber from 0.5 up to 0.8', () => {
    expect(getSuccessColor(0.5)).toBe('#f59e0b');
    expect(getSuccessColor(0.79)).toBe('#f59e0b');
  });

  it('returns orange from 0.3 up to 0.5', () => {
    expect(getSuccessColor(0.3)).toBe('#d97706');
    expect(getSuccessColor(0.49)).toBe('#d97706');
  });

  it('returns red below 0.3', () => {
    expect(getSuccessColor(0.29)).toBe('#ef4444');
    expect(getSuccessColor(0)).toBe('#ef4444');
  });
});
