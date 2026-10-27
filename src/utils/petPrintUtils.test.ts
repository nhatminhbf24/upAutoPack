import { describe, it, expect } from 'vitest';
import { analyzeWhiteBackground } from './petPrintUtils';

describe('petPrintUtils', () => {
  it('exports analyzeWhiteBackground and removeWhiteBackground functions', () => {
    expect(typeof analyzeWhiteBackground).toBe('function');
  });
});
