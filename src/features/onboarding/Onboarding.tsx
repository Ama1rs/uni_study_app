import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WelcomeStep } from './WelcomeStep';
import { AISetupStep } from './AISetupStep';
import { BasicProfileStep } from './BasicProfileStep';

interface OnboardingData {
    aiSource?: 'api' | 'local';
    usageProfile?: 'study' | 'writing' | 'general';
    apiEndpoint?: string;
    name?: string;
    themePreference?: 'light' | 'dark';
    privacyChoice?: 'local' | 'cloud-ready';
}

export function Onboarding({ userId, onComplete }: { userId: number; onComplete: () => void }) {
    const [step, setStep] = useState<'welcome' | 'ai' | 'profile'>('welcome');
    const [data, setData] = useState<OnboardingData>({});

    const updateData = (newData: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...newData }));
    };

    const steps = ['welcome', 'ai', 'profile'];
    const currentIndex = steps.indexOf(step);

    const handleWelcomeNext = () => setStep('ai');

    const handleAINext = (aiData: { source: 'api' | 'local'; usageProfile: 'study' | 'writing' | 'general'; apiEndpoint?: string }) => {
        updateData({ aiSource: aiData.source, usageProfile: aiData.usageProfile, apiEndpoint: aiData.apiEndpoint });
        setStep('profile');
    };

    const getSystemPromptForUsageProfile = (profile: string): string => {
        switch (profile) {
            case 'study':
                return "You are a helpful AI study assistant. Focus on helping with note-taking, summarization, flashcard creation, and explaining complex academic concepts clearly and concisely.";
            case 'writing':
                return "You are a helpful AI writing assistant. Focus on helping with essays, research papers, document structure, grammar, and academic writing improvement.";
            case 'general':
            default:
                return "You are a helpful AI assistant ready to help with a wide variety of tasks including studying, writing, and general assistance.";
        }
    };

    const handleProfileComplete = async (profileData: { name: string; themePreference: 'light' | 'dark'; privacyChoice: 'local' | 'cloud-ready' }) => {
        const finalData = { ...data, ...profileData };
        try {
            if (userId) {
                await invoke('set_user_profile', {
                    profile: {
                        id: userId,
                        name: finalData.name,
                        university: null, // No longer required
                        avatar_path: null
                    }
                });
            }

            await invoke('set_onboarding_state', {
                onboardingState: {
                    completed: true,
                    ai_provider: finalData.aiSource === 'api' ? 'gemini' : 'local',
                    ai_api_key: finalData.aiSource === 'api' ? finalData.apiEndpoint : null,
                    ai_endpoint: finalData.aiSource === 'local' ? 'http://localhost:11434' : null,
                    db_type: 'sqlite',
                    db_url: null,
                    user_name: finalData.name,
                    university: null,
                    usage_profile: finalData.usageProfile,
                    privacy_choice: finalData.privacyChoice,
                    theme_preference: finalData.themePreference,
                    system_prompt: getSystemPromptForUsageProfile(finalData.usageProfile || 'general')
                }
            });
            onComplete();
        } catch (e) {
            console.error("Failed to save onboarding state:", e);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm grid place-items-center">
            <div className="w-[500px] max-h-[90vh] bg-surface border rounded-2xl shadow-2xl flex flex-col">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5 px-6 py-4 border-b">
                    {steps.map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? 'bg-accent' : 'bg-tertiary'
                                }`}
                        />
                    ))}
                </div>

                {/* Content area - centered with flex */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col justify-center">
                    {step === 'welcome' && <WelcomeStep onNext={handleWelcomeNext} />}
                    {step === 'ai' && <AISetupStep onNext={handleAINext} onBack={() => setStep('welcome')} />}
                    {step === 'profile' && <BasicProfileStep onComplete={handleProfileComplete} onBack={() => setStep('ai')} />}
                </div>
            </div>
        </div>
    );
}