import { Flashcard } from '../../../types/node-system';
import { motion } from 'framer-motion';
import { Layers, Brain, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Deck {
  id: number | 'all';
  title: string;
  count: number;
  cards: Flashcard[];
}

interface DeckLibraryProps {
  decks: Deck[];
  selectedDeck: Deck | null;
  onDeckSelect: (deck: Deck) => void;
  onStartStudy: (deck: Deck) => void;
}

export function DeckLibrary({ decks, selectedDeck, onDeckSelect, onStartStudy }: DeckLibraryProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Flashcard Decks</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck, index) => (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700",
              "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
              selectedDeck?.id === deck.id && "ring-2 ring-accent ring-offset-2"
            )}
            onClick={() => onDeckSelect(deck)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  {deck.id === 'all' ? (
                    <Layers size={20} className="text-accent" />
                  ) : (
                    <Brain size={20} className="text-accent" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{deck.title}</h3>
                  <p className="text-sm text-text-secondary">{deck.count} cards</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-text-tertiary" />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-text-tertiary font-mono">
                {deck.id === 'all' ? 'All Cards' : `Deck ${deck.id}`}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy(deck);
                }}
                className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded-lg hover:bg-accent-hover transition-colors"
              >
                Study
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {decks.length === 0 && (
        <div className="text-center py-12">
          <Brain size={48} className="mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary">No flashcard decks found</p>
          <p className="text-sm text-text-tertiary mt-2">Create your first deck to get started</p>
        </div>
      )}
    </div>
  );
}