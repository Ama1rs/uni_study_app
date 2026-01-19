import { describe, it, expect } from 'vitest'
import { parseBookMetadata, formatTimeAgo } from '../utils/bookUtils'

describe('bookUtils', () => {
  describe('parseBookMetadata', () => {
    it('should parse title with series and author', () => {
      const input = 'The Getaway (Diary of a Wimpy Kid Book 12) -- Kinney, Jeff'
      const result = parseBookMetadata(input)
      
      expect(result.title).toBe('The Getaway')
      expect(result.series).toBe('Diary of a Wimpy Kid Book 12')
      expect(result.author).toBe('Jeff Kinney')
    })

    it('should parse title with author only', () => {
      const input = 'The Great Gatsby - F. Scott Fitzgerald'
      const result = parseBookMetadata(input)
      
      expect(result.title).toBe('The Great Gatsby')
      expect(result.author).toBe('F. Scott Fitzgerald')
      expect(result.series).toBeNull()
    })

    it('should parse title only', () => {
      const input = 'Moby Dick'
      const result = parseBookMetadata(input)
      
      expect(result.title).toBe('Moby Dick')
      expect(result.author).toBeNull()
      expect(result.series).toBeNull()
    })

    it('should handle file extensions', () => {
      const input = 'The Getaway.epub'
      const result = parseBookMetadata(input)
      
      expect(result.title).toBe('The Getaway')
      expect(result.author).toBeNull()
      expect(result.series).toBeNull()
    })

    it('should handle whitespace', () => {
      const input = '  The Great Gatsby  -  F. Scott Fitzgerald  '
      const result = parseBookMetadata(input)
      
      expect(result.title).toBe('The Great Gatsby')
      expect(result.author).toBe('F. Scott Fitzgerald')
    })
  })

  describe('formatTimeAgo', () => {
    it('should format time as "Just now" for current time', () => {
      const now = new Date().toISOString()
      const result = formatTimeAgo(now)
      expect(result).toBe('Just now')
    })

    it('should format time in minutes', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      const result = formatTimeAgo(date)
      expect(result).toBe('5m ago')
    })

    it('should format time in hours', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      const result = formatTimeAgo(date)
      expect(result).toBe('2h ago')
    })

    it('should format time in days', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      const result = formatTimeAgo(date)
      expect(result).toBe('3d ago')
    })

    it('should format time in months', () => {
      const date = new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString() // ~2 months ago
      const result = formatTimeAgo(date)
      expect(result).toBe('2mo ago')
    })

    it('should format time in years', () => {
      const date = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // 2 years ago
      const result = formatTimeAgo(date)
      expect(result).toBe('2y ago')
    })
  })
})