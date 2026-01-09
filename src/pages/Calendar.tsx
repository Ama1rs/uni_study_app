import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

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
    const [error, setError] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ isOpen: false, title: '', description: '', action: () => { } });

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
        setError(null);

        // Construct ISO string for start_at
        const startDateTime = new Date(selectedDate);
        const [hours, minutes] = newEventTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);

        // Default 1 hour duration
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(hours + 1);

        try {
            await invoke('create_planner_event', {
                payload: {
                    repositoryId: null,
                    title: newEventTitle,
                    description: newEventDesc,
                    startAt: startDateTime.toISOString(),
                    endAt: endDateTime.toISOString(),
                    recurrence: null
                }
            });
            setNewEventTitle('');
            setNewEventDesc('');
            setShowAddEvent(false);
            loadEvents();
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            console.error('Error creating event:', errorMsg);
        }
    }

    async function deleteEvent(id: number, e: React.MouseEvent) {
        e.stopPropagation();
        setConfirmState({
            isOpen: true,
            title: 'Delete Event',
            description: 'Are you sure you want to delete this event?',
            action: async () => {
                try {
                    await invoke('delete_planner_event', { id });
                    loadEvents();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    console.error(e);
                }
            }
        });
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
            calendarDays.push(<div key={`empty-${i}`} className="border-b border-r border-border" />);
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
                        "border-b border-r border-border p-3 cursor-pointer transition-all relative group hover:bg-bg-hover min-h-[48px]",
                        isSelected ? "bg-bg-hover ring-2 ring-accent/30" : ""
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label={`${monthNames[currentDate.getMonth()]} ${i}, ${currentDate.getFullYear()}. ${dayEvents.length} events.`}
                >
                    <div className="flex justify-between items-start">
                        <span
                            className={cn(
                                "text-sm font-mono font-medium",
                                isToday ? "text-accent font-bold" : "text-text-secondary"
                            )}
                        >
                            {i} {isToday && '•'}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
                                setShowAddEvent(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-bg-active rounded-sm text-text-tertiary touch-target"
                            aria-label="Add event"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Events List */}
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] custom-scrollbar">
                        {dayEvents.map(event => (
                            <div key={event.id} className="text-xs pl-2 pr-1 py-1 border-l-2 border-accent text-text-primary bg-accent/5 truncate group/event relative hover:bg-accent/10 rounded-sm" role="listitem">
                                <span className="font-medium">{event.title}</span>
                                <button
                                    onClick={(e) => deleteEvent(event.id, e)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/event:block text-text-tertiary hover:text-red-400 p-1 touch-target"
                                    aria-label={`Delete event: ${event.title}`}
                                >
                                    <Trash2 size={12} />
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
                        className="p-2 rounded-lg hover:bg-bg-hover transition-colors touch-target"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-bg-hover transition-colors touch-target"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="Next month"
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
            <div className="grid grid-cols-7 border-t border-l border-border flex-1 bg-bg-primary overflow-hidden" style={{ gridAutoRows: '1fr' }}>
                {renderCalendarDays()}
            </div>

            {/* Add Event Modal */}
            {showAddEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Add Event - {selectedDate.toLocaleDateString()}
                        </h3>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                                {error === 'No active user session found'
                                    ? 'You must be logged in to create events. Please log in first.'
                                    : error}
                            </div>
                        )}

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
                            <Button variant="ghost" size="compact" onClick={() => { setShowAddEvent(false); setError(null); }}>Cancel</Button>
                            <Button variant="primary" size="compact" onClick={addEvent}>Create Event</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button for New Event */}
            <button
                onClick={() => {
                    setSelectedDate(new Date());
                    setShowAddEvent(true);
                }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-accent hover:bg-accent-hover text-black rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 focus-visible-ring z-50"
                aria-label="Create new event"
            >
                <Plus size={24} strokeWidth={2.5} />
            </button>
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                danger
                confirmText="Delete"
            />
        </div >
    );
}
