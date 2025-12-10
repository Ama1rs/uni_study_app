import { ArrowRight } from 'lucide-react';

export function WelcomeStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
            {/* Logo */}
            <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center">
                <span className="text-black font-bold text-3xl">A</span>
            </div>

            {/* Text */}
            <div className="space-y-3 max-w-md">
                <h1 className="text-2xl font-bold text-text-primary">
                    Welcome to Academia
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed font-mono">
                    Your all-in-one university companion. Organize notes, track progress, and study smarter.
                </p>
            </div>

            {/* CTA */}
            <button
                onClick={onNext}
                className="group px-6 py-3 bg-accent text-black rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    );
}
