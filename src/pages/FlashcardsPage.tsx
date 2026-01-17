import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Resource, Flashcard } from '../types/node-system';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers, ChevronRight, Brain, ArrowRight, Flame, Trophy, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';


interface Deck {
    id: number | 'all';
    title: string;
    count: number;
    cards: Flashcard[];
}

interface StudySession {
    id: number;
    start_at: string;
    is_break: boolean;
}

export function FlashcardsPage() {
    const [loading, setLoading] = useState(true);
    const [decks, setDecks] = useState<Deck[]>([]);
    const [view, setView] = useState<'library' | 'preview' | 'study'>('library');
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
    const [streak, setStreak] = useState(0);



    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [cards, resources, sessions] = await Promise.all([
                invoke<Flashcard[]>('get_all_flashcards'),
                invoke<Resource[]>('get_resources'),
                invoke<StudySession[]>('get_study_sessions', { from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() })
            ]);

            const daysSet = new Set(
                sessions
                    .filter(s => !s.is_break)
                    .map(s => s.start_at.split('T')[0])
            );

            let s = 0;
            const currentCheck = new Date();
            let checkStr = currentCheck.toISOString().split('T')[0];

            if (!daysSet.has(checkStr)) {
                currentCheck.setDate(currentCheck.getDate() - 1);
                checkStr = currentCheck.toISOString().split('T')[0];
            }

            while (daysSet.has(checkStr)) {
                s++;
                currentCheck.setDate(currentCheck.getDate() - 1);
                checkStr = currentCheck.toISOString().split('T')[0];
            }
            setStreak(s);

            const noteMap = new Map(resources.map(r => [r.id, r]));
            const deckMap = new Map<number, Flashcard[]>();

            cards.forEach(card => {
                if (!deckMap.has(card.note_id)) {
                    deckMap.set(card.note_id, []);
                }
                deckMap.get(card.note_id)!.push(card);
            });

            const loadedDecks: Deck[] = [];
            // Add "All Cards" deck
            if (cards.length > 0) {
                loadedDecks.push({
                    id: 'all',
                    title: 'All Collected Packs',
                    count: cards.length,
                    cards: cards
                });
            }

            // specific decks
            deckMap.forEach((deckCards, noteId) => {
                const note = noteMap.get(noteId);
                if (note) {
                    loadedDecks.push({
                        id: noteId,
                        title: note.title,
                        count: deckCards.length,
                        cards: deckCards
                    });
                }
            });

            setDecks(loadedDecks);
        } catch (e) {
            console.error("Failed to load flashcards", e);
        } finally {
            setLoading(false);
        }
    }

    const openPreview = (deckId: number | 'all') => {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
            setSelectedDeck(deck);
            setView('preview');
        }
    };

    const startStudy = (deck: Deck) => {
        // Shuffle cards
        const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
        setStudyQueue(shuffled);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setSessionStats({ reviewed: 0, correct: 0 });
        setView('study');
    };



    const handleNextCard = () => {
        setIsFlipped(false);
        setTimeout(() => {
            if (currentCardIndex < studyQueue.length - 1) {
                setCurrentCardIndex(prev => prev + 1);
            } else {
                // End of session
                alert(`Session Complete! Reviewed ${sessionStats.reviewed + 1} cards.`);
                setView('library');
            }


        }, 200);
    };

    const handleRate = (rating: 'again' | 'good' | 'easy') => {
        // Here we would implement spaced repetition logic
        // For now just move next
        setSessionStats(prev => ({
            reviewed: prev.reviewed + 1,
            correct: prev.correct + (rating !== 'again' ? 1 : 0)
        }));
        handleNextCard();
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full text-text-tertiary">Loading decks...</div>;
    }

    if (view === 'study' && studyQueue.length > 0) {
        const currentCard = studyQueue[currentCardIndex];
        const progress = ((currentCardIndex) / studyQueue.length) * 100;



        // Flat Mode View (Original)
        return (
            <div className="flex-1 w-full flex flex-col bg-bg-base relative overflow-hidden">
                {/* Stats / Progress Header */}
                <div className="p-8 flex items-center justify-between z-10 bg-gradient-to-b from-bg-primary/80 to-transparent backdrop-blur-sm">
                    <button
                        onClick={() => setView('preview')}
                        className="group flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all px-4 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5"
                    >
                        <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
                        <span className="font-medium">End Session</span>
                    </button>
                    <div className="flex items-center gap-4">


                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-text-tertiary">
                                <span>Progress</span>
                                <span className="text-accent">{currentCardIndex + 1} / {studyQueue.length}</span>
                            </div>
                            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>


                {/* Card Stage */}
                <div className="flex-1 flex items-center justify-center overflow-visible">
                    <div className="relative w-full max-w-2xl h-[450px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                        <AnimatePresence initial={false} mode="wait">
                            {!isFlipped ? (
                                <motion.div
                                    key="front"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 bg-bg-surface border border-border rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center group hover:border-accent/30 transition-all overflow-hidden"
                                >
                                    <div className="relative z-10 w-full">
                                        <span className="inline-block px-3 py-1 rounded-lg bg-bg-primary text-text-tertiary text-[10px] uppercase tracking-[0.2em] mb-8 font-bold border border-border">
                                            Question
                                        </span>
                                        <h3 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight tracking-tight">
                                            {currentCard.front}
                                        </h3>

                                        <div className="mt-12 flex flex-col items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                                            <div className="flex items-center gap-2 text-text-tertiary">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                                <span className="text-sm font-medium">Click to reveal answer</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Corner Accents - Simple & Paper-like */}
                                    <div className="absolute top-8 left-8 w-1 h-8 bg-border/50 rounded-full" />
                                    <div className="absolute top-8 left-8 w-8 h-1 bg-border/50 rounded-full" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="back"
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 bg-bg-surface border-2 border-accent/30 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center overflow-hidden"
                                >
                                    <div className="relative z-10 flex flex-col items-center w-full">
                                        <span className="inline-block px-3 py-1 rounded-lg bg-accent/10 text-accent text-[10px] uppercase tracking-[0.2em] mb-8 font-bold border border-accent/20">
                                            Answer
                                        </span>
                                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar px-4 w-full">
                                            <p className="text-2xl md:text-3xl font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
                                                {currentCard.back}
                                            </p>
                                        </div>

                                        {currentCard.heading_path && (
                                            <div className="mt-10 px-4 py-2 bg-bg-primary rounded-xl text-[11px] text-text-tertiary border border-border flex items-center gap-2">
                                                <span className="opacity-70">Source:</span>
                                                <span className="font-medium">{currentCard.heading_path}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Controls */}
                <div className="h-32 flex items-center justify-center gap-6 pb-8">
                    <AnimatePresence>
                        {isFlipped && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="flex gap-4"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRate('again'); }}
                                    className="px-10 py-4 rounded-2xl bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-red-500/10 hover:border-red-500/30 shadow-lg shadow-red-500/5"
                                >
                                    Again
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRate('good'); }}
                                    className="px-10 py-4 rounded-2xl bg-accent/5 text-accent hover:bg-accent/10 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-accent/10 hover:border-accent/30 shadow-lg shadow-accent/5"
                                >
                                    Good
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                                    className="px-10 py-4 rounded-2xl bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-emerald-500/10 hover:border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                                >
                                    Easy
                                </button>
                            </motion.div>
                        )}
                        {!isFlipped && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Tap card to flip</span>
                                <div className="w-1 h-8 bg-gradient-to-b from-accent/20 to-transparent rounded-full" />
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        );
    }

    if (view === 'preview' && selectedDeck) {
        return (
            <div className="flex-1 w-full bg-bg-base flex flex-col">
                <header className="px-6 py-4 border-b border-border/30 bg-bg-base flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView('library')}
                            className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                            title="Back to Library"
                        >
                            <ChevronRight className="rotate-180" size={20} />
                        </button>

                        <div className="h-6 w-px bg-border/50" />

                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-lg border border-border/30",
                                selectedDeck.id === 'all' ? "text-purple-400 bg-purple-400/5" : "text-accent bg-accent/5"
                            )}>
                                {selectedDeck.id === 'all' ? <Layers size={18} /> : <BookOpen size={18} />}
                            </div>

                            <div>
                                <h1 className="text-base font-semibold text-text-primary leading-none mb-0.5">
                                    {selectedDeck.title}
                                </h1>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                                    {selectedDeck.count} Cards
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => startStudy(selectedDeck)}
                        className="px-4 py-2 bg-accent text-black font-semibold text-sm rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <Brain size={16} />
                        Start Session
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
                        {selectedDeck.id === 'all' ? (
                            // Grouped view for "All Collected Packs"
                            decks.filter(d => d.id !== 'all').map((pack, idx) => (
                                <motion.div
                                    key={pack.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    onClick={() => setSelectedDeck(pack)}
                                    className="group relative aspect-[3/4] w-full max-w-[240px] cursor-pointer"
                                >
                                    {/* Background Stack Layers */}
                                    <div className="absolute inset-0 bg-bg-surface border border-border rounded-2xl translate-x-1.5 translate-y-1.5 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-bg-surface border border-border rounded-2xl translate-x-0.75 translate-y-0.75 group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform duration-300" />

                                    {/* Top Card (Interactive Surface) */}
                                    <div className="relative h-full bg-bg-surface border border-border rounded-2xl group-hover:border-accent/40 transition-all flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                                            <div className="mb-4 p-3 bg-accent/10 rounded-xl text-accent group-hover:scale-110 transition-transform">
                                                <Layers size={24} />
                                            </div>
                                            <h3 className="text-sm font-bold text-text-primary leading-tight group-hover:text-accent transition-colors">
                                                {pack.title}
                                            </h3>
                                            <p className="mt-2 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                                {pack.count} Elements
                                            </p>
                                        </div>

                                        <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span>Open Pack</span>
                                            <ArrowRight size={10} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            // Flat view for individual deck
                            selectedDeck.cards.map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className="group relative aspect-[3/4] w-full max-w-[240px] bg-bg-surface border border-border rounded-2xl hover:border-accent/40 transition-all flex flex-col items-center justify-center p-8 text-center cursor-default overflow-hidden"
                                >
                                    {/* Card Brand */}
                                    <div className="absolute top-6 left-6 text-[8px] font-bold text-text-tertiary uppercase tracking-widest opacity-40">ITEM_{idx + 1}</div>

                                    {/* Main Content */}
                                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                                        <p className="text-sm font-bold text-text-primary leading-relaxed line-clamp-6">
                                            {card.front}
                                        </p>
                                    </div>

                                    {/* Bottom Indicator */}
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4 h-1 bg-border rounded-full group-hover:bg-accent/40 transition-colors" />
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-bg-base overflow-y-auto custom-scrollbar">
            {/* Minimal Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border/30 bg-bg-base">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between"
                >
                    <h1 className="text-lg font-bold text-text-primary">Flashcard Library</h1>

                    <div className="flex items-center gap-4 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1.5">
                            <Layers size={14} className="text-text-secondary" />
                            {decks.filter(d => d.id !== 'all').length} Decks
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Trophy size={14} className="text-text-secondary" />
                            {decks.find(d => d.id === 'all')?.count || 0} Cards
                        </span>
                        {streak > 0 && (
                            <span className="flex items-center gap-1.5 text-accent">
                                <Flame size={14} />
                                {streak} Day Streak
                            </span>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Main Content - List View */}
            <div className="flex-1 px-6 py-6">
                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Your Collections</h2>
                        <button className="text-[10px] font-medium text-text-tertiary hover:text-text-primary transition-colors">SORT BY: RECENT</button>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {decks.map((deck, idx) => (
                                <motion.div
                                    key={deck.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => openPreview(deck.id)}
                                    className="group flex items-center justify-between px-4 py-4 border border-border/30 rounded-xl cursor-pointer hover:border-accent/40 hover:bg-bg-surface/30 transition-all"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            "p-2.5 rounded-lg border border-border/30 transition-colors flex-shrink-0",
                                            deck.id === 'all'
                                                ? "text-purple-400 group-hover:border-purple-400/50 group-hover:bg-purple-400/5"
                                                : "text-text-secondary group-hover:border-accent/50 group-hover:text-accent group-hover:bg-accent/5"
                                        )}>
                                            {deck.id === 'all' ? <Layers size={18} /> : <BookOpen size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                                                {deck.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                                                <span>{deck.count} cards</span>
                                                {deck.id === 'all' && <span className="text-purple-400/70">• Smart Collection</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                        <ChevronRight size={16} className="text-text-tertiary" />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {decks.length === 0 && (
                            <div className="py-20 text-center">
                                <p className="text-sm text-text-tertiary">No decks found. Create a note to generate flashcards.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
