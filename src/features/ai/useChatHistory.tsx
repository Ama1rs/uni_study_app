import { useState, useEffect, useCallback } from 'react';

// Reuse ChatMessage interface from ChatLocalLLM
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metrics?: {
        ttft_ms: number;
        tps: number;
        total_tokens: number;
        total_time_ms: number;
    };
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'llm-chat-sessions';
const CURRENT_SESSION_KEY = 'llm-current-session-id';

// Helper to generate session title from first user message
const generateTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    const content = firstUserMessage.content.trim();
    const maxLength = 40;

    if (content.length <= maxLength) {
        return content;
    }

    return content.substring(0, maxLength).trim() + '...';
};

// Generate unique ID
const generateId = (): string => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useChatHistory() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Load sessions from localStorage on mount
    useEffect(() => {
        try {
            const storedSessions = localStorage.getItem(STORAGE_KEY);
            const storedCurrentId = localStorage.getItem(CURRENT_SESSION_KEY);

            if (storedSessions) {
                const parsed = JSON.parse(storedSessions) as ChatSession[];
                setSessions(parsed);

                // Restore current session if it exists
                if (storedCurrentId && parsed.some(s => s.id === storedCurrentId)) {
                    setCurrentSessionId(storedCurrentId);
                } else if (parsed.length > 0) {
                    // Default to most recent session
                    const mostRecent = parsed.sort((a, b) => b.updatedAt - a.updatedAt)[0];
                    setCurrentSessionId(mostRecent.id);
                }
            } else {
                // Create initial session if none exists
                const initialSession: ChatSession = {
                    id: generateId(),
                    title: 'New Chat',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                setSessions([initialSession]);
                setCurrentSessionId(initialSession.id);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            // Create a fresh session on error
            const fallbackSession: ChatSession = {
                id: generateId(),
                title: 'New Chat',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            setSessions([fallbackSession]);
            setCurrentSessionId(fallbackSession.id);
        }
    }, []);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
            } catch (error) {
                console.error('Failed to save chat history:', error);
            }
        }
    }, [sessions]);

    // Save current session ID whenever it changes
    useEffect(() => {
        if (currentSessionId) {
            try {
                localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
            } catch (error) {
                console.error('Failed to save current session ID:', error);
            }
        }
    }, [currentSessionId]);

    // Create a new session
    const createSession = useCallback(() => {
        const newSession: ChatSession = {
            id: generateId(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);

        return newSession.id;
    }, []);

    // Select a session by ID
    const selectSession = useCallback((id: string) => {
        const sessionExists = sessions.some(s => s.id === id);
        if (sessionExists) {
            setCurrentSessionId(id);
        }
    }, [sessions]);

    // Add a message to the current session
    const addMessage = useCallback((
        role: 'user' | 'assistant' | 'system',
        content: string,
        metrics?: ChatMessage['metrics']
    ) => {
        if (!currentSessionId) return;

        const newMessage: ChatMessage = {
            role,
            content,
            ...(metrics && { metrics })
        };

        setSessions(prev => prev.map(session => {
            if (session.id === currentSessionId) {
                const updatedMessages = [...session.messages, newMessage];
                return {
                    ...session,
                    messages: updatedMessages,
                    title: session.messages.length === 0 ? generateTitle(updatedMessages) : session.title,
                    updatedAt: Date.now()
                };
            }
            return session;
        }));
    }, [currentSessionId]);

    // Delete a session
    const deleteSession = useCallback((id: string) => {
        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);

            // If we deleted the current session, switch to another one
            if (id === currentSessionId) {
                if (filtered.length > 0) {
                    const mostRecent = filtered.sort((a, b) => b.updatedAt - a.updatedAt)[0];
                    setCurrentSessionId(mostRecent.id);
                } else {
                    // No sessions left, create a new one
                    const newSession: ChatSession = {
                        id: generateId(),
                        title: 'New Chat',
                        messages: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    setCurrentSessionId(newSession.id);
                    return [newSession];
                }
            }

            return filtered;
        });
    }, [currentSessionId]);

    // Clear all sessions
    const clearAllSessions = useCallback(() => {
        const newSession: ChatSession = {
            id: generateId(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setSessions([newSession]);
        setCurrentSessionId(newSession.id);

        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CURRENT_SESSION_KEY);
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    }, []);

    // Get messages for the current session
    const getCurrentMessages = useCallback((): ChatMessage[] => {
        if (!currentSessionId) return [];
        const currentSession = sessions.find(s => s.id === currentSessionId);
        return currentSession?.messages || [];
    }, [currentSessionId, sessions]);

    // Update session title manually
    const updateSessionTitle = useCallback((id: string, title: string) => {
        setSessions(prev => prev.map(session =>
            session.id === id
                ? { ...session, title, updatedAt: Date.now() }
                : session
        ));
    }, []);

    return {
        sessions,
        currentSessionId,
        createSession,
        selectSession,
        addMessage,
        deleteSession,
        clearAllSessions,
        getCurrentMessages,
        updateSessionTitle
    };
}
