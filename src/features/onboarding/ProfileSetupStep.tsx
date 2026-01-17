import { useState } from 'react';
import { User, GraduationCap, Check, ArrowLeft } from 'lucide-react';

interface ProfileSetupStepProps {
    onComplete: (data: { name: string; university: string }) => void;
    onBack: () => void;
}

export function ProfileSetupStep({ onComplete, onBack }: ProfileSetupStepProps) {
    const [name, setName] = useState('');
    const [university, setUniversity] = useState('');

    const handleSubmit = () => {
        if (name && university) {
            onComplete({ name, university });
        }
    };

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary mb-1">Your Profile</h2>
                <p className="text-sm text-text-secondary">Personalize your experience.</p>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-text-secondary mb-1.5">University</label>
                    <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                            type="text"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            placeholder="Your university"
                            className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-auto pt-4">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!name || !university}
                    className="px-4 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Complete <Check size={14} />
                </button>
            </div>
        </div>
    );
}
