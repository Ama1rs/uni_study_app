import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Flashcard } from '../../types/node-system';
import { DealerScene } from './DealerScene';
import { DealerCharacter } from './DealerCharacter';
import { FlashcardMesh } from './FlashcardMesh';
import { motion, AnimatePresence } from 'framer-motion';

interface DealerModeProps {
    currentCard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
    onRate: (rating: 'again' | 'good' | 'easy') => void;
    progress: number;
    currentIndex: number;
    totalCards: number;
}

type DealerAnimation = 'idle' | 'shuffle' | 'deal' | 'retrieve' | 'slideAside' | 'discard' | 'presenting';
type CardAnimation = 'dealing' | 'showing' | 'flipping' | 'slidingLeft' | 'slidingRight' | 'discarding';

export function DealerMode({
    currentCard,
    isFlipped,
    onFlip,
    onRate,
    progress,
    currentIndex,
    totalCards
}: DealerModeProps) {
    const [dealerAnimation, setDealerAnimation] = useState<DealerAnimation>('idle');
    const [cardAnimation, setCardAnimation] = useState<CardAnimation>('showing');
    const [showControls, setShowControls] = useState(false);
    const [knewItCount, setKnewItCount] = useState(0);
    const [forgotItCount, setForgotItCount] = useState(0);

    const remainingCount = Math.max(0, totalCards - currentIndex - 1);

    // Initial dealing animation when component mounts or card changes
    useEffect(() => {
        setDealerAnimation('deal');
        setCardAnimation('dealing');
        setShowControls(false);

        const timer = setTimeout(() => {
            setDealerAnimation('presenting');
            setCardAnimation('showing');
            setShowControls(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, [currentCard.id]);

    // Handle flip animation
    const handleFlip = () => {
        if (cardAnimation === 'showing') {
            setCardAnimation('flipping');
            onFlip();

            setTimeout(() => {
                setCardAnimation('showing');
            }, 800);
        }
    };

    // Handle rating with animations
    const handleRating = (rating: 'again' | 'good' | 'easy') => {
        setShowControls(false);

        if (rating === 'again') {
            // Discard to right pile (forgot it)
            setDealerAnimation('discard');
            setCardAnimation('slidingRight');
        } else {
            // Slide to left pile (knew it)
            setDealerAnimation('slideAside');
            setCardAnimation('slidingLeft');
        }

        setTimeout(() => {
            if (rating === 'again') {
                setForgotItCount(prev => prev + 1);
            } else {
                setKnewItCount(prev => prev + 1);
            }
            onRate(rating);
            setDealerAnimation('idle');
            setCardAnimation('showing');
        }, 1200);
    };

    return (
        <div className="relative w-full h-full bg-black">
            {/* 3D Canvas - Optimized for maximum stability */}
            <Canvas
                camera={{ position: [0, 5, 12], fov: 32 }}
                gl={{
                    antialias: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    alpha: true,
                    depth: true
                }}
                shadows={false}
                className="w-full h-full"
            >
                <DealerScene
                    knewItCount={knewItCount}
                    forgotItCount={forgotItCount}
                    remainingCount={remainingCount}
                />
                {/* Character - Moved closer and scaled up */}
                <group position={[0, -1.5, 0.0]} scale={[2.5, 2.5, 2.5]}>
                    <DealerCharacter animationState={dealerAnimation} />
                </group>
                <FlashcardMesh
                    card={currentCard}
                    isFlipped={isFlipped}
                    animationState={cardAnimation}
                    onAnimationComplete={() => { }}
                    knewItCount={knewItCount}
                    forgotItCount={forgotItCount}
                />

                {/* Optional: Allow user to orbit camera slightly - Refined for Seated POV */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.5}
                    maxPolarAngle={Math.PI / 2.1}
                    minAzimuthAngle={-Math.PI / 8}
                    maxAzimuthAngle={Math.PI / 8}
                    makeDefault
                />
            </Canvas>

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Progress Bar - Top */}
                <div className="absolute top-0 left-0 right-0 p-8 pointer-events-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                                Dealer Mode
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest text-accent">
                                {currentIndex + 1} / {totalCards}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                className="h-full bg-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </div>

                {/* Interaction Hint - Center */}
                <AnimatePresence>
                    {!isFlipped && cardAnimation === 'showing' && (
                        <motion.div
                            key="flip-hint"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto"
                            style={{ marginTop: '280px' }} // Adjusted for further back camera
                        >
                            <button
                                onClick={handleFlip}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/50 hover:text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 backdrop-blur-md shadow-2xl"
                            >
                                Tap to Flip
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Rating Controls - Bottom */}
                <AnimatePresence>
                    {isFlipped && showControls && cardAnimation === 'showing' && (
                        <motion.div
                            key="rating-controls"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto"
                        >
                            <button
                                onClick={() => handleRating('again')}
                                className="px-10 py-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-red-500/20 hover:border-red-500/40 shadow-lg shadow-red-500/10 backdrop-blur-sm"
                            >
                                Forgot It
                            </button>
                            <button
                                onClick={() => handleRating('good')}
                                className="px-10 py-4 rounded-2xl bg-accent/10 text-accent hover:bg-accent/20 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-accent/20 hover:border-accent/40 shadow-lg shadow-accent/10 backdrop-blur-sm"
                            >
                                Good
                            </button>
                            <button
                                onClick={() => handleRating('easy')}
                                className="px-10 py-4 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg shadow-emerald-500/10 backdrop-blur-sm"
                            >
                                Knew It
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
