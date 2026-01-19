import { Flashcard } from '../../../types/node-system';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StudySessionViewProps {
  cards: Flashcard[];
  currentCardIndex: number;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function StudySessionView({
  cards,
  currentCardIndex,
  isFlipped,
  onFlip,
  onNext,
  onPrevious,
  onCorrect,
  onIncorrect
}: StudySessionViewProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">No cards to study</p>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <div className="flex flex-col h-full p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-accent h-2 rounded-full"
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-text-secondary mt-2 text-center">
          Card {currentCardIndex + 1} of {cards.length}
        </p>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className={cn(
            "w-full max-w-2xl h-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg cursor-pointer select-none",
            "flex items-center justify-center p-8 text-center"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFlip}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div style={{ backfaceVisibility: 'hidden' }}>
            {!isFlipped ? (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-4">Question</h3>
                <p className="text-text-secondary">{currentCard.front}</p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-4">Answer</h3>
                <p className="text-text-secondary">{currentCard.back}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={currentCardIndex === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            "bg-gray-100 dark:bg-gray-700 text-text-secondary",
            "hover:bg-gray-200 dark:hover:bg-gray-600",
            currentCardIndex === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={onIncorrect}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg transition-colors",
              "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300",
              "hover:bg-red-200 dark:hover:bg-red-800"
            )}
          >
            <XCircle size={20} />
            Incorrect
          </button>
          <button
            onClick={onCorrect}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg transition-colors",
              "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300",
              "hover:bg-green-200 dark:hover:bg-green-800"
            )}
          >
            <CheckCircle size={20} />
            Correct
          </button>
        </div>

        <button
          onClick={onNext}
          disabled={currentCardIndex === cards.length - 1}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            "bg-gray-100 dark:bg-gray-700 text-text-secondary",
            "hover:bg-gray-200 dark:hover:bg-gray-600",
            currentCardIndex === cards.length - 1 && "opacity-50 cursor-not-allowed"
          )}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}