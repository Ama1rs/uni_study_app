import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Music, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Layout } from './Layout';

export function FocusMode() {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // TODO: Play notification sound
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(sessionType === 'focus' ? 25 * 60 : 5 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Layout>
            <div className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden">
                <div className="z-10 flex flex-col items-center gap-12">
                    {/* Session Type Toggle */}
                    <div className="flex items-center gap-2 p-1 rounded-full border border-border bg-bg-hover backdrop-blur-sm">
                        <button
                            onClick={() => { setSessionType('focus'); setTimeLeft(25 * 60); setIsActive(false); }}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                                sessionType === 'focus' ? "bg-accent/10 text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            Focus
                        </button>
                        <button
                            onClick={() => { setSessionType('break'); setTimeLeft(5 * 60); setIsActive(false); }}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                                sessionType === 'break' ? "bg-accent/10 text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            Break
                        </button>
                    </div>

                    {/* Timer Display */}
                    <div className="relative group cursor-default select-none">
                        <div className="text-[12rem] leading-none font-bold tracking-tighter tabular-nums text-text-primary">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-center text-xl font-medium mt-4 opacity-50 text-text-secondary">
                            {isActive ? 'Stay focused' : 'Ready to start?'}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={toggleTimer}
                            className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20 bg-accent"
                        >
                            {isActive ? <Pause size={32} className="text-black" /> : <Play size={32} className="text-black ml-1" />}
                        </button>

                        <button
                            onClick={resetTimer}
                            className="w-14 h-14 rounded-full flex items-center justify-center border border-border transition-all hover:bg-bg-hover active:scale-95 text-text-secondary hover:text-text-primary"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-12 flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary">
                        <Music size={18} />
                        <span className="text-sm">Ambient Sounds</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary">
                        <Settings2 size={18} />
                        <span className="text-sm">Settings</span>
                    </button>
                </div>
            </div>
        </Layout>
    );
}
