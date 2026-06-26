'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { ModelConfig, ALL_MODELS } from '@/lib/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from './ModelSelector';
import { Button } from '@/components/ui/button';
import { Loader2, Cpu, Trophy, AlertTriangle, Copy, Check, GitCompare, SlidersHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { diffWords } from 'diff';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResponseColumnProps {
  model: ModelConfig;
  onModelChange: (model: ModelConfig) => void;
  customModelId: string;
  onCustomModelIdChange: (id: string) => void;
  prompt: string;
  systemPrompt?: string;
  trigger: number;
  apiKey: string;
  isSyncScroll?: boolean;
  onScroll?: (scrollTop: number) => void;
  syncScrollTop?: number;
  compareWith?: string;
  isCompareMode?: boolean;
  onFinish?: (result: {
    modelId: string;
    modelName: string;
    response: string;
    latency: number;
    cost: number;
    tokens: number;
    rank?: 'best' | 'worst' | 'none';
  }) => void;
}

const hashApiKey = (key: string): string => {
  if (!key) return 'empty';
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export function ResponseColumn({ 
  model, 
  onModelChange, 
  customModelId,
  onCustomModelIdChange,
  prompt, 
  systemPrompt,
  trigger, 
  apiKey,
  isSyncScroll,
  onScroll,
  syncScrollTop,
  compareWith,
  isCompareMode,
  onFinish
}: ResponseColumnProps) {
  const [rank, setRank] = React.useState<'best' | 'worst' | 'none'>('none');
  const [isCopied, setIsCopied] = React.useState(false);
  const [showParams, setShowParams] = React.useState(false);
  const [temperature, setTemperature] = React.useState(0.7);
  const [maxTokens, setMaxTokens] = React.useState(2000);
  const [topP, setTopP] = React.useState(1.0);
  
  const isCustomModel = model.id.startsWith('custom-');
  const startTimeRef = React.useRef<number>(0);
  const [latency, setLatency] = React.useState<number>(0);
  const [ttft, setTtft] = React.useState<number>(0);
  const responseRef = React.useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: `${model.provider}-${model.id}-${hashApiKey(apiKey)}-${customModelId}`,
    transport: new DefaultChatTransport({
      api: `/api/chat/${model.provider}`,
      body: {
        modelId: isCustomModel ? customModelId : model.id,
        apiKey: apiKey,
        systemPrompt: systemPrompt,
        temperature: temperature,
        maxTokens: maxTokens,
        topP: topP,
      },
    }),
    onFinish: ({ message }) => {
      const now = performance.now();
      const finalLatency = now - startTimeRef.current;
      setLatency(finalLatency);
      
      const responseText = message.parts
        ? message.parts
            .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
            .map((part) => part.text)
            .join('')
        : '';
      
      const tokens = Math.ceil(responseText.length / 4);
      const cost = (tokens / 1000000) * model.outputPrice;

      if (onFinish) {
        onFinish({
          modelId: model.id,
          modelName: model.name,
          response: responseText,
          latency: finalLatency,
          cost: cost,
          tokens: tokens,
          rank: rank,
        });
      }
    },
  });

  const lastMessage = messages[messages.length - 1];
  const response = lastMessage?.parts
    ? lastMessage.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('')
    : '';

  // Track TTFT when response starts appearing
  React.useEffect(() => {
    if (response.length > 0 && ttft === 0 && startTimeRef.current > 0) {
      const now = performance.now();
      const ttftValue = now - startTimeRef.current;
      setTtft(ttftValue);
    }
  }, [response, ttft, model.name]);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Sync scroll position if enabled
  React.useEffect(() => {
    if (isSyncScroll && syncScrollTop !== undefined && responseRef.current) {
      responseRef.current.scrollTop = syncScrollTop;
    }
  }, [isSyncScroll, syncScrollTop]);

  const handleLocalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncScroll && onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Reset and trigger new chat when trigger is fired
  React.useEffect(() => {
    if (trigger > 0 && prompt) {
      if (!apiKey) {
        alert(`Please enter an API key for ${model.provider.toUpperCase()} in the configuration section.`);
        return;
      }
      if (isCustomModel && !customModelId.trim()) {
        alert(`Please enter a custom Model ID for ${model.provider.toUpperCase()}`);
        return;
      }
      setMessages([]);
      setTtft(0);
      setLatency(0);
      setRank('none');
      startTimeRef.current = performance.now();
      sendMessage({ text: prompt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const diffedResponse = React.useMemo(() => {
    if (!isCompareMode || !compareWith || !response) return null;
    return diffWords(compareWith, response);
  }, [isCompareMode, compareWith, response]);

  // Calculate tokens (approximate: 4 chars per token)
  const tokenCount = Math.ceil(response.length / 4);
  const cost = (tokenCount / 1000000) * model.outputPrice;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      <Card className={`flex flex-col h-full min-h-[500px] glass transition-all duration-500 group relative overflow-hidden ${isLoading ? 'animate-pulse-emerald' : 'hover:border-emerald-500/30'} ${rank === 'best' ? 'ring-2 ring-emerald-500/50 shadow-[0_0_30px_-10px_oklch(0.75_0.18_160_/_30%)]' : ''} ${rank === 'worst' ? 'ring-2 ring-red-500/30' : ''}`}>
        <CardHeader className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-[10px] font-black tracking-[0.2em] text-emerald-500/60 uppercase">
                {model.provider.toUpperCase()}
              </CardTitle>
              <AnimatePresence>
                {rank === 'best' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Trophy className="h-3.5 w-3.5 text-emerald-400 drop-shadow-glow" />
                  </motion.div>
                )}
                {rank === 'worst' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500/50" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowParams(!showParams)}
                className={`h-7 w-7 transition-colors ${showParams ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCopy}
                disabled={!response}
                className="h-7 w-7 text-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10"
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
            </div>
          </div>
          
          <div className="space-y-3">
            <ModelSelector 
              value={model.id} 
              onValueChange={(id) => {
                if (!id) return;
                const newModel = ALL_MODELS.find((m) => m.id === id);
                if (newModel) onModelChange(newModel);
              }} 
            />

            <AnimatePresence>
              {showParams && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 pt-2 border-t border-emerald-500/10"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase text-emerald-500/40 font-bold tracking-wider">Temp: {temperature}</Label>
                      <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase text-emerald-500/40 font-bold tracking-wider">Top P: {topP}</Label>
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={topP} 
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="w-full h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase text-emerald-500/40 font-bold tracking-wider">Max: {maxTokens}</Label>
                      <input 
                        type="range" min="100" max="8000" step="100" 
                        value={maxTokens} 
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isCustomModel && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-3 w-3 text-emerald-500/60" />
                  <Label className="text-[10px] uppercase text-emerald-500/60 tracking-tight">Custom Model ID</Label>
                </div>
                <Input 
                  placeholder="e.g., gpt-4-32k or gemini-2.0-pro-exp"
                  value={customModelId}
                  onChange={(e) => onCustomModelIdChange(e.target.value)}
                  className="h-8 text-xs bg-emerald-950/20 border-emerald-900/50 focus-visible:ring-emerald-500/30 text-emerald-100"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden relative z-10">
          <div 
            ref={responseRef}
            onScroll={handleLocalScroll}
            className="flex-1 overflow-y-auto border border-emerald-500/10 rounded-xl p-5 bg-black/40 text-emerald-50/90 text-sm shadow-inner scrollbar-thin scrollbar-thumb-emerald-500/20"
          >
            {error ? (
              <div className="text-destructive font-medium p-2 border border-destructive/20 rounded bg-destructive/5">
                Error: {error.message}
              </div>
            ) : diffedResponse ? (
              <div className="whitespace-pre-wrap leading-relaxed font-sans">
                {diffedResponse.map((part, index) => (
                  <span 
                    key={index} 
                    className={part.added ? 'diff-added' : part.removed ? 'diff-removed' : ''}
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            ) : response ? (
              <article className="prose prose-invert prose-emerald max-w-none prose-sm prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-emerald-500/10">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{response}</ReactMarkdown>
              </article>
            ) : (
              isLoading ? (
                <div className="space-y-3 animate-in fade-in duration-500">
                  <div className="h-4 bg-emerald-500/10 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-emerald-500/10 rounded w-full animate-pulse delay-75" />
                  <div className="h-4 bg-emerald-500/10 rounded w-5/6 animate-pulse delay-150" />
                  <div className="h-4 bg-emerald-500/10 rounded w-2/3 animate-pulse delay-300" />
                </div>
              ) : <span className="text-emerald-900/40 italic font-mono text-[10px] tracking-widest uppercase">Waiting for execution protocol...</span>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
              <div className="flex flex-col space-y-0.5">
                <span className="text-emerald-500/40 uppercase tracking-widest font-bold">Tokens</span>
                <span className="font-mono text-emerald-100/80">{tokenCount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-emerald-500/40 uppercase tracking-widest font-bold">TTFT</span>
                <span className="font-mono text-emerald-100/80">{(ttft > 0) ? `${Math.round(ttft)}ms` : '-'}</span>
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-emerald-500/40 uppercase tracking-widest font-bold">Latency</span>
                <span className="font-mono text-emerald-100/80">{(!isLoading && latency > 0) ? `${Math.round(latency)}ms` : '-'}</span>
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-emerald-500/40 uppercase tracking-widest font-bold">Est. Cost</span>
                <span className="font-mono text-emerald-100/80">${cost.toFixed(6)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setRank(rank === 'best' ? 'none' : 'best')}
                className={`h-8 w-8 rounded-full border transition-all ${rank === 'best' ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_oklch(0.75_0.18_160_/_40%)]' : 'border-emerald-500/10 text-emerald-500/40 hover:bg-emerald-500/10'}`}
              >
                <Trophy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setRank(rank === 'worst' ? 'none' : 'worst')}
                className={`h-8 w-8 rounded-full border transition-all ${rank === 'worst' ? 'bg-red-500 text-white border-red-500' : 'border-emerald-500/10 text-emerald-500/40 hover:bg-red-500/10 hover:text-red-500'}`}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      </Card>
    </motion.div>
  );
}
