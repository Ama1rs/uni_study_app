import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
    ArrowLeft, 
    ArrowRight, 
    AlertTriangle, 
    CheckCircle, 
    Loader2, 
    Clock
} from 'lucide-react';
import { MigrationProgress, MigrationEligibility } from '@/types/sync';

interface MigrationWizardProps {
    from: 'local' | 'cloud';
    to: 'local' | 'cloud';
    onComplete: (newMode: 'local' | 'cloud') => void;
    onCancel: () => void;
}

export function MigrationWizard({ from, to, onComplete, onCancel }: MigrationWizardProps) {
    const [currentPhase, setCurrentPhase] = useState<'confirmation' | 'eligibility' | 'migration' | 'complete'>('confirmation');
    const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
    const [eligibility, setEligibility] = useState<MigrationEligibility | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isLocalToCloud = from === 'local' && to === 'cloud';
    const isCloudToLocal = from === 'cloud' && to === 'local';

    const getMigrationDescription = () => {
        if (isLocalToCloud) {
            return {
                title: 'Enable Cloud Sync',
                description: 'Move your local data to secure cloud storage and enable cross-device synchronization.',
                warning: 'This will upload your data to Supabase servers.',
                benefits: ['Access data from any device', 'Automatic backups', 'Real-time synchronization']
            };
        } else if (isCloudToLocal) {
            return {
                title: 'Switch to Local Storage',
                description: 'Download your cloud data and store it locally on this device.',
                warning: 'Data will no longer sync across devices.',
                benefits: ['Full privacy control', 'Offline access', 'No subscription required']
            };
        }
        return {
            title: 'Change Storage Mode',
            description: 'Change where your data is stored.',
            warning: 'Please backup your data before proceeding.',
            benefits: []
        };
    };

    const checkEligibility = async () => {
        setCurrentPhase('eligibility');
        try {
            const result = await invoke<MigrationEligibility>('check_migration_eligibility');
            setEligibility(result);
        } catch (error) {
            console.error('Failed to check eligibility:', error);
            setError('Failed to check migration eligibility');
        }
    };

    const startMigration = async () => {
        if (!eligibility?.is_eligible) {
            setError('Migration is not eligible');
            return;
        }

        setCurrentPhase('migration');
        const migrationId = `migration_${Date.now()}`;
        
        try {
            console.log('Starting migration with ID:', migrationId);
            await invoke('initiate_local_to_cloud_migration', { migrationId });
            await monitorMigrationProgress(migrationId);
        } catch (error) {
            console.error('Failed to start migration:', error);
            setError('Failed to start migration');
        }
    };

    const monitorMigrationProgress = async (migrationId: string) => {
        console.log('Monitoring migration progress for:', migrationId);
        const checkProgress = async () => {
            try {
                const progress = await invoke<MigrationProgress>('get_migration_progress');
                setMigrationProgress(progress);
                
                if (progress?.phase === 'completed') {
                    setCurrentPhase('complete');
                    await invoke('complete_migration');
                } else if (progress?.phase === 'failed') {
                    setError('Migration failed. Please try again.');
                } else if (progress) {
                    setTimeout(checkProgress, 1000);
                }
            } catch (error) {
                console.error('Error checking migration progress:', error);
            }
        };

        checkProgress();
    };

    const migrationInfo = getMigrationDescription();

    if (currentPhase === 'complete') {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Migration Complete!
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Your data has been successfully migrated to {to === 'cloud' ? 'cloud storage' : 'local storage'}.
                </p>
                <button
                    onClick={() => onComplete(to)}
                    className="px-6 py-3 bg-accent text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Continue
                </button>
            </div>
        );
    }

    if (currentPhase === 'eligibility') {
        return (
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Loader2 className="animate-spin text-accent" size={24} />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Checking Migration Eligibility
                    </h2>
                </div>

                {eligibility && (
                    <div className="space-y-4">
                        {eligibility.is_eligible ? (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="text-sm font-medium text-green-800 mb-2">Migration Ready</h3>
                                <p className="text-sm text-green-700">
                                    Your data is ready for migration to {to === 'cloud' ? 'cloud storage' : 'local storage'}.
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                    Estimated data size: {(eligibility.data_size_estimate / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h3 className="text-sm font-medium text-red-800 mb-2">Migration Not Eligible</h3>
                                <ul className="text-sm text-red-700 list-disc list-inside">
                                    {eligibility.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft size={14} /> Cancel
                            </button>
                            {eligibility.is_eligible && (
                                <button
                                    onClick={startMigration}
                                    className="px-6 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90"
                                >
                                    Start Migration <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (currentPhase === 'migration') {
        return (
            <div className="p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Migrating Data...
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isLocalToCloud ? 'Uploading your data to cloud storage...' : 'Downloading your data locally...'}
                    </p>
                </div>

                {migrationProgress && (
                    <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                            <span style={{ color: 'var(--text-primary)' }}>{migrationProgress.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-accent h-2 rounded-full transition-all duration-300"
                                style={{ width: `${migrationProgress.progress_percentage}%` }}
                            />
                        </div>
                        
                        <div className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Phase: {migrationProgress.phase}
                        </div>
                        
                        {migrationProgress.conflicts_detected > 0 && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    {migrationProgress.conflicts_detected} conflicts detected. These will be handled automatically.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertTriangle size={16} />
                            <span className="font-medium">Migration Error</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {migrationInfo.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {migrationInfo.description}
                </p>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                        <p className="text-sm text-yellow-700 mt-1">{migrationInfo.warning}</p>
                    </div>
                </div>
            </div>

            {/* Benefits */}
            {migrationInfo.benefits.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                        Benefits
                    </h3>
                    <div className="space-y-2">
                        {migrationInfo.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span style={{ color: 'var(--text-primary)' }}>{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Estimated Time */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                    <Clock className="text-blue-600" size={20} />
                    <div>
                        <h4 className="text-sm font-medium text-blue-800">Estimated Time</h4>
                        <p className="text-sm text-blue-700">
                            {isLocalToCloud 
                                ? '5-10 minutes depending on data size and internet speed'
                                : isCloudToLocal 
                                ? '2-5 minutes depending on data size'
                                : '5-10 minutes'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                    <ArrowLeft size={14} /> Cancel
                </button>
                <button
                    onClick={checkEligibility}
                    className="px-6 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90"
                >
                    Check Eligibility <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}