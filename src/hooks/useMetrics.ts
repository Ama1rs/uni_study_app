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

function useStudyTimeMetric() {
    // Simulated data
    const [data, setData] = useState<number[]>([2.5, 4, 3.5, 5, 4.5, 6, 8]);
    const [labels] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const [currentValue, setCurrentValue] = useState(12.5);

    // Live timer simulation
    useEffect(() => {
        const interval = setInterval(() => {
            // Increment slightly to simulate active studying
            setCurrentValue(prev => +(prev + 0.01).toFixed(2));

            // Update last data point
            setData(prev => {
                const newData = [...prev];
                newData[newData.length - 1] = +(newData[newData.length - 1] + 0.01).toFixed(2);
                return newData;
            });
        }, 60000); // Every minute

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
