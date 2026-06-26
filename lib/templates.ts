export type PromptTemplate = {
  id: string;
  name: string;
  prompt: string;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'coding',
    name: 'Coding',
    prompt: 'You are an expert software engineer. Write a clean, efficient, and well-documented solution for the following problem: ',
  },
  {
    id: 'writing',
    name: 'Creative Writing',
    prompt: 'You are a professional writer. Create a compelling story or article based on this topic: ',
  },
  {
    id: 'analysis',
    name: 'Data Analysis',
    prompt: 'You are a senior data analyst. Analyze the following information and provide key insights, trends, and recommendations: ',
  },
  {
    id: 'summarization',
    name: 'Summarization',
    prompt: 'Summarize the following text into a concise and informative summary, capturing the most important points: ',
  },
  {
    id: 'reasoning',
    name: 'Logical Reasoning',
    prompt: 'You are a logic expert. Break down the following problem step-by-step and provide a sound conclusion based on reasoning: ',
  },
];
