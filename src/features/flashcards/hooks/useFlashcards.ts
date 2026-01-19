import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Flashcard } from '../../../types/node-system';

export interface Deck {
  id: number | 'all';
  title: string;
  count: number;
  cards: Flashcard[];
}

export interface StudySession {
  id: number;
  start_at: string;
  is_break: boolean;
}

export function useFlashcards() {
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [studyStats, setStudyStats] = useState({
    studiedToday: 0,
    accuracy: 0,
    streak: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cards, resources, sessions] = await Promise.all([
        invoke<Flashcard[]>('get_all_flashcards'),
        invoke<any[]>('get_resources'),
        invoke<StudySession[]>('get_study_sessions', { 
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() 
        })
      ]);

      // Group cards by resource (deck)
      const cardMap = new Map<number, Flashcard[]>();
      cards.forEach(card => {
        if (!cardMap.has(card.note_id)) {
          cardMap.set(card.note_id, []);
        }
        cardMap.get(card.note_id)!.push(card);
      });

      // Create decks
      const newDecks: Deck[] = [
        {
          id: 'all',
          title: 'All Cards',
          count: cards.length,
          cards: cards
        }
      ];

      // Add individual decks from resources
      resources.forEach(resource => {
        const resourceCards = cardMap.get(resource.id) || [];
        if (resourceCards.length > 0) {
          newDecks.push({
            id: resource.id,
            title: resource.title,
            count: resourceCards.length,
            cards: resourceCards
          });
        }
      });

      setDecks(newDecks);

      // Calculate stats
      const todaySet = new Set(
        sessions
          .filter(s => !s.is_break)
          .map(s => s.start_at.split('T')[0])
      );

      setStudyStats({
        studiedToday: todaySet.size,
        accuracy: 0.85, // Mock calculation
        streak: 5 // Mock calculation
      });

    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  return {
    loading,
    decks,
    studyStats,
    refreshData
  };
}