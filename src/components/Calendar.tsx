import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlannerEvent {
    id: number;
    repository_id?: number;
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    recurrence?: string;
}

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<PlannerEvent[]>([]);

    // Modal state
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');

    useEffect(() => {
        loadEvents();
    }, [currentDate]);

    async function loadEvents() {
        // Calculate start and end of the displayed month (including padding days)
        // For simplicity, we just fetch all or a wide range. 
        // Ideally: fetch from 1st day of prev month to last day of next month.
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();

        try {
            const res = await invoke<PlannerEvent[]>('get_planner_events', { from: start, to: end });
            setEvents(res);
        } catch (e) { console.error(e); }
    }

    async function addEvent() {
        if (!newEventTitle) return;

        // Construct ISO string for start_at
        const startDateTime = new Date(selectedDate);
        const [hours, minutes] = newEventTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);

        // Default 1 hour duration
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(hours + 1);

        try {
            await invoke('create_planner_event', {
                repositoryId: null, // Global event for now
                title: newEventTitle,
                description: newEventDesc,
                startAt: startDateTime.toISOString(),
                endAt: endDateTime.toISOString(),
                recurrence: null
            });
            setNewEventTitle('');
            setNewEventDesc('');
            setShowAddEvent(false);
            loadEvents();
        } catch (e) { console.error(e); }
    }

    async function deleteEvent(id: number, e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirm('Delete this event?')) return;
        try {
            await invoke('delete_planner_event', { id });
            loadEvents();
        } catch (e) { console.error(e); }
    }

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const startDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getEventsForDay = (day: number) => {
        return events.filter(e => {
            const d = new Date(e.start_at);
            return d.getDate() === day &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear();
        });
    };

    const renderCalendarDays = () => {
        const totalDays = daysInMonth(currentDate);
        const startDay = startDayOfMonth(currentDate);
        const calendarDays = [];

        // Empty cells for previous month
        for (let i = 0; i < startDay; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-24 md:h-32 border-b border-r border-white/5" />);
        }

        // Days of current month
        for (let i = 1; i <= totalDays; i++) {
            const isToday =
                i === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

            const isSelected =
                i === selectedDate.getDate() &&
                currentDate.getMonth() === selectedDate.getMonth() &&
                currentDate.getFullYear() === selectedDate.getFullYear();

            const dayEvents = getEventsForDay(i);

            calendarDays.push(
                <div
                    key={i}
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))}
                    className={cn(
                        "h-24 md:h-32 border-b border-r border-white/5 p-2 cursor-pointer transition-all relative group hover:bg-white/5",
                        isSelected ? "bg-white/5" : ""
                    )}
                >
                    <div className="flex justify-between items-start">
                        <span
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                                isToday ? "text-white" : ""
                            )}
                            style={{
                                backgroundColor: isToday ? 'var(--accent)' : 'transparent',
                                color: isToday ? '#ffffff' : 'var(--text-primary)'
                            }}
                        >
                            {i}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
                                setShowAddEvent(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"
                        >
                            <Plus size={14} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Events List */}
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-2rem)]">
                        {dayEvents.map(event => (
                            <div key={event.id} className="text-xs p-1 rounded bg-blue-500/20 text-blue-200 truncate group/event relative">
                                {event.title}
                                <button
                                    onClick={(e) => deleteEvent(event.id, e)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/event:block text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return calendarDays;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-white/10">
                {days.map(day => (
                    <div key={day} className="text-center py-2 text-sm font-medium border-r border-white/5 last:border-r-0" style={{ color: 'var(--text-secondary)' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-l border-t border-white/5 flex-1 bg-black/20 rounded-bl-xl rounded-br-xl overflow-hidden">
                {renderCalendarDays()}
            </div>

            {/* Add Event Modal */}
            {showAddEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Add Event - {selectedDate.toLocaleDateString()}
                        </h3>

                        <div className="space-y-3">
                            <input
                                className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                placeholder="Event Title"
                                value={newEventTitle}
                                onChange={e => setNewEventTitle(e.target.value)}
                                autoFocus
                            />
                            <input
                                type="time"
                                className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                value={newEventTime}
                                onChange={e => setNewEventTime(e.target.value)}
                            />
                            <textarea
                                className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent resize-none h-20"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                placeholder="Description (optional)"
                                value={newEventDesc}
                                onChange={e => setNewEventDesc(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowAddEvent(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                            <button onClick={addEvent} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'var(--accent)' }}>Create Event</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
