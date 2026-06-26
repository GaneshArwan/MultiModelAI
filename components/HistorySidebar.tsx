'use client';

import * as React from 'react';
import { getHistory, ComparisonHistory, clearHistory } from '@/lib/history';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Trash2, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { motion, AnimatePresence } from 'framer-motion';

interface HistorySidebarProps {
  onLoad: (entry: ComparisonHistory) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ onLoad, isOpen, onClose }: HistorySidebarProps) {
  const [history, setHistory] = React.useState<ComparisonHistory[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  const filteredHistory = history.filter(h => 
    h.prompt.toLowerCase().includes(search.toLowerCase()) ||
    h.results.some(r => r.modelName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleClear = () => {
    if (confirm('Clear all history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-80 glass border-r border-emerald-500/10 z-[100] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-black tracking-widest uppercase text-emerald-100">Chronicle</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-emerald-500/10 text-emerald-500/50">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            <div className="p-4 border-b border-emerald-500/10">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500/30 group-focus-within:text-emerald-500 transition-colors" />
                <Input 
                  placeholder="Search archives..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-black/40 border-emerald-500/10 text-xs text-emerald-100 focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/10">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-20 italic text-xs text-emerald-500">
                  <p>No records found</p>
                </div>
              ) : (
                filteredHistory.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="p-4 bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30 cursor-pointer transition-all group"
                      onClick={() => onLoad(entry)}
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-emerald-500/40">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-[8px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                            {entry.results.length} MODELS
                          </Badge>
                        </div>
                        <p className="text-xs text-emerald-100/70 line-clamp-2 leading-relaxed group-hover:text-emerald-100 transition-colors">
                          {entry.prompt}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {entry.results.map((r, i) => (
                            <span key={i} className={`text-[8px] font-bold uppercase tracking-tighter ${r.rank === 'best' ? 'text-emerald-400' : r.rank === 'worst' ? 'text-red-500/50' : 'text-emerald-500/30'}`}>
                              {r.modelName} {r.rank === 'best' ? '🏆' : r.rank === 'worst' ? '⚠️' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-emerald-500/10">
              <Button 
                variant="ghost" 
                className="w-full justify-start space-x-2 text-emerald-500/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Purge All Data</span>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
