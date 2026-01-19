import { ArrowRight } from 'lucide-react';

export function WelcomeStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="flex flex-col items-center text-center py-8">
            {/* Logo */}
            <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 mb-6">
                <span className="text-white font-bold text-3xl">A</span>
            </div>

            {/* Text */}
            <h1 className="text-2xl font-bold text-text-primary mb-3">
                Welcome to Academia
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm mb-8">
                Your all-in-one university companion. Organize notes, track progress, and study smarter.
            </p>

            {/* CTA */}
            <button
                onClick={onNext}
                className="px-8 py-3 bg-accent text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-accent-hover transition-colors"
            >
                Get Started
                <ArrowRight size={16} />
            </button>
        </div>
    );
}
