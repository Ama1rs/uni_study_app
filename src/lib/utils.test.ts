import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
    })

    it('should handle conflicting classes', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    })

    it('should handle conditional classes', () => {
      expect(cn('base-class', true && 'conditional-class', false && 'hidden-class')).toBe('base-class conditional-class')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('', null, undefined)).toBe('')
    })

    it('should handle arrays and objects', () => {
      expect(cn(['class1', 'class2'], { class3: true, class4: false })).toBe('class1 class2 class3')
    })
  })
})