import { useState, useCallback, useRef } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistoryState<T>(initialPresent: T, maxHistoryLength = 13) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // Set new state and push previous state to past stack (capped at maxHistoryLength)
  const set = useCallback(
    (newPresent: T | ((curr: T) => T)) => {
      setState((currentState) => {
        const resolvedPresent =
          typeof newPresent === 'function'
            ? (newPresent as (curr: T) => T)(currentState.present)
            : newPresent;

        // Skip recording if unchanged
        if (resolvedPresent === currentState.present) {
          return currentState;
        }

        const newPast = [...currentState.past, currentState.present];
        // Enforce maximum history length of 13
        if (newPast.length > maxHistoryLength) {
          newPast.splice(0, newPast.length - maxHistoryLength);
        }

        return {
          past: newPast,
          present: resolvedPresent,
          future: [], // clear redo stack on new action
        };
      });
    },
    [maxHistoryLength]
  );

  // Undo: Step back to previous state
  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  // Redo: Step forward to next state
  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    historyCount: state.past.length,
  };
}
