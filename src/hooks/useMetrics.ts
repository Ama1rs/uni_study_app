import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Resource {
    id: number;
    created_at?: string;
}

export function useMetrics() {
    const resources = useResourcesMetric();
    const studyTime = useStudyTimeMetric();
    const focus = useFocusMetric();

    return { resources, studyTime, focus };
}

function useResourcesMetric() {
    const [data, setData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [currentValue, setCurrentValue] = useState(0);

    useEffect(() => {
        async function fetchResources() {
            try {
                const res = await invoke<Resource[]>('get_resources');
                setCurrentValue(res.length);

                // Group by date (last 7 days)
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const counts = last7Days.map(date => {
                    return res.filter(r => r.created_at?.startsWith(date)).length;
                });

                // Cumulative sum
                let sum = 0;
                const cumulativeCounts = counts.map(c => {
                    sum += c;
                    return sum;
                });

                // If no data, show a flat line or some mock baseline
                if (res.length === 0) {
                    setData([0, 0, 0, 0, 0, 0, 0]);
                } else {
                    setData(cumulativeCounts);
                }

                setLabels(last7Days.map(d => d.slice(5))); // MM-DD
            } catch (e) {
                console.error("Failed to fetch resources metric", e);
            }
        }
        fetchResources();
    }, []);

    return { data, labels, currentValue };
}

interface StudySession {
    id: number;
    start_at: string;
    duration: number | null;
    is_break: boolean;
}

function useStudyTimeMetric() {
    const [data, setData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [currentValue, setCurrentValue] = useState(0);

    useEffect(() => {
        async function fetchStudyTime() {
            try {
                // Fetch last 7 days of sessions
                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 6);
                const from = fromDate.toISOString().split('T')[0];

                const sessions = await invoke<StudySession[]>('get_study_sessions', { from });

                // Group by day
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const dailyHours = last7Days.map(date => {
                    const daySessions = sessions.filter(s => s.start_at.startsWith(date) && !s.is_break);
                    const totalSeconds = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
                    return +(totalSeconds / 3600).toFixed(2);
                });

                setData(dailyHours);
                setLabels(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']); // Simplification for now

                // Current value = total hours today
                const todayHours = dailyHours[dailyHours.length - 1];
                setCurrentValue(todayHours);
            } catch (e) {
                console.error("Failed to fetch study time metric", e);
            }
        }
        fetchStudyTime();

        // Refresh every 5 minutes
        const interval = setInterval(fetchStudyTime, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { data, labels, currentValue };
}

function useFocusMetric() {
    // Mock data
    const [data] = useState<number[]>([65, 70, 60, 75, 80, 72, 85]);
    const [labels] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const [currentValue] = useState(85);

    return { data, labels, currentValue };
}
