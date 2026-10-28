import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('correctly catches and stores error via getDerivedStateFromError', () => {
    const error = new Error('Simulated React crash');
    const newState = ErrorBoundary.getDerivedStateFromError(error);

    expect(newState.hasError).toBe(true);
    expect(newState.error).toBe(error);
  });
});
