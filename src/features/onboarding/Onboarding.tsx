import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WelcomeStep } from './WelcomeStep';
import { AISetupStep } from './AISetupStep';
import { DatabaseSetupStep } from './DatabaseSetupStep';
import { ProfileSetupStep } from './ProfileSetupStep';
import { ThemeSetupStep } from './ThemeSetupStep';

interface OnboardingData {
    aiProvider?: 'gemini' | 'local';
    aiApiKey?: string;
    aiEndpoint?: string;
    dbType?: 'sqlite' | 'supabase';
    dbUrl?: string;
    dbKey?: string;
    name?: string;
    university?: string;
}

export function Onboarding({ userId, onComplete }: { userId?: number; onComplete: () => void }) {
    const [step, setStep] = useState<'welcome' | 'ai' | 'db' | 'theme' | 'profile'>('welcome');
    const [data, setData] = useState<OnboardingData>({});

    const updateData = (newData: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...newData }));
    };

    const steps = ['welcome', 'ai', 'db', 'theme', 'profile'];
    const currentIndex = steps.indexOf(step);

    const handleWelcomeNext = () => setStep('ai');

    const handleAINext = (aiData: { provider: 'gemini' | 'local'; apiKey?: string; endpoint?: string }) => {
        updateData({ aiProvider: aiData.provider, aiApiKey: aiData.apiKey, aiEndpoint: aiData.endpoint });
        setStep('db');
    };

    const handleDBNext = (dbData: { type: 'sqlite' | 'supabase'; url?: string; key?: string }) => {
        updateData({ dbType: dbData.type, dbUrl: dbData.url, dbKey: dbData.key });
        setStep('theme');
    };

    const handleThemeNext = () => setStep('profile');

    const handleProfileComplete = async (profileData: { name: string; university: string }) => {
        const finalData = { ...data, ...profileData };
        try {
            if (userId) {
                await invoke('set_user_profile', {
                    profile: {
                        id: userId,
                        name: finalData.name ?? profileData.name,
                        university: finalData.university ?? profileData.university,
                        avatar_path: null
                    }
                });
            }

            await invoke('set_onboarding_state', {
                onboardingState: {
                    completed: true,
                    ai_provider: finalData.aiProvider,
                    ai_api_key: finalData.aiApiKey,
                    ai_endpoint: finalData.aiEndpoint,
                    db_type: finalData.dbType,
                    db_url: finalData.dbUrl,
                    user_name: finalData.name,
                    university: finalData.university
                }
            });
            onComplete();
        } catch (e) {
            console.error("Failed to save onboarding state:", e);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm grid place-items-center">
            <div className="w-[500px] max-h-[90vh] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5 px-6 py-4 border-b border-white/10">
                    {steps.map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? 'bg-accent' : 'bg-white/20'
                                }`}
                        />
                    ))}
                </div>

                {/* Content area - centered with flex */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col justify-center">
                    {step === 'welcome' && <WelcomeStep onNext={handleWelcomeNext} />}
                    {step === 'ai' && <AISetupStep onNext={handleAINext} onBack={() => setStep('welcome')} />}
                    {step === 'db' && <DatabaseSetupStep onNext={handleDBNext} onBack={() => setStep('ai')} />}
                    {step === 'theme' && <ThemeSetupStep onNext={handleThemeNext} onBack={() => setStep('db')} />}
                    {step === 'profile' && <ProfileSetupStep onComplete={handleProfileComplete} onBack={() => setStep('theme')} />}
                </div>
            </div>
        </div>
    );
}
