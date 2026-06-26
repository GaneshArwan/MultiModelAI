export type ComparisonHistory = {
  id: string;
  timestamp: number;
  prompt: string;
  results: {
    modelId: string;
    modelName: string;
    response: string;
    latency: number;
    cost: number;
    tokens: number;
    rank?: 'best' | 'worst' | 'none';
  }[];
};

const HISTORY_KEY = 'multi_model_ai_history';

export const saveToHistory = (entry: ComparisonHistory) => {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const updatedHistory = [entry, ...history].slice(0, 50); // Keep last 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};

export const getHistory = (): ComparisonHistory[] => {
  if (typeof window === 'undefined') return [];
  const history = localStorage.getItem(HISTORY_KEY);
  return history ? JSON.parse(history) : [];
};

export const clearHistory = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
};
