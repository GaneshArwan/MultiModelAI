export type ModelConfig = {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  inputPrice: number; // Price per 1M tokens
  outputPrice: number; // Price per 1M tokens
};

export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', inputPrice: 2.5, outputPrice: 15.0 },
      { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', provider: 'openai', inputPrice: 30.0, outputPrice: 180.0 },
      { id: 'gpt-4o', name: 'GPT-4o (Legacy)', provider: 'openai', inputPrice: 2.5, outputPrice: 10.0 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', inputPrice: 0.15, outputPrice: 0.6 },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', inputPrice: 0.05, outputPrice: 0.4 },
      { id: 'custom-openai', name: 'Custom Model...', provider: 'openai', inputPrice: 0, outputPrice: 0 },
    ] as ModelConfig[],
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-opus-4-7', name: 'Claude 3 Opus 4.7', provider: 'anthropic', inputPrice: 5.0, outputPrice: 25.0 },
      { id: 'claude-3-sonnet-4-6', name: 'Claude 3.5 Sonnet 4.6', provider: 'anthropic', inputPrice: 3.0, outputPrice: 15.0 },
      { id: 'claude-3-haiku-3-5', name: 'Claude 3.5 Haiku', provider: 'anthropic', inputPrice: 0.25, outputPrice: 1.25 },
      { id: 'custom-anthropic', name: 'Custom Model...', provider: 'anthropic', inputPrice: 0, outputPrice: 0 },
    ] as ModelConfig[],
  },
  google: {
    name: 'Google',
    models: [
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'google', inputPrice: 2.0, outputPrice: 12.0 },
      { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', provider: 'google', inputPrice: 0.5, outputPrice: 3.0 },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', provider: 'google', inputPrice: 0.25, outputPrice: 1.5 },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'google', inputPrice: 0.1, outputPrice: 0.4 },
      { id: 'custom-google', name: 'Custom Model...', provider: 'google', inputPrice: 0, outputPrice: 0 },
    ] as ModelConfig[],
  },
} as const;

export const ALL_MODELS = [
  ...PROVIDERS.openai.models,
  ...PROVIDERS.anthropic.models,
  ...PROVIDERS.google.models,
];

export const DEFAULT_MODELS = {
  column1: PROVIDERS.openai.models[0],
  column2: PROVIDERS.anthropic.models[1],
  column3: PROVIDERS.google.models[0],
};
