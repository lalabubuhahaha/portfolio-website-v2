import type { ContentBlocks } from "./blocks";

const HISTORY_LIMIT = 50;

export type BlockHistory = { before: ContentBlocks[]; current: ContentBlocks | null; after: ContentBlocks[] };
type HistoryAction =
  | { type: "edit" | "reset"; document: ContentBlocks | null }
  | { type: "undo" | "redo" };

export function startBlockHistory(document: ContentBlocks | null): BlockHistory {
  return { before: [], current: document, after: [] };
}

export function blockHistory(state: BlockHistory, action: HistoryAction): BlockHistory {
  switch (action.type) {
    case "reset": return startBlockHistory(action.document);
    case "edit": {
      if (action.document === state.current) return state;
      if (!state.current || !action.document) return startBlockHistory(action.document);
      return { before: [...state.before, state.current].slice(-HISTORY_LIMIT), current: action.document, after: [] };
    }
    case "undo": {
      const current = state.before.at(-1);
      if (!current || !state.current) return state;
      return { before: state.before.slice(0, -1), current, after: [state.current, ...state.after] };
    }
    case "redo": {
      const [current, ...after] = state.after;
      if (!current || !state.current) return state;
      return { before: [...state.before, state.current], current, after };
    }
  }
}
