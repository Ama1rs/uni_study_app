import { describe, it, expect } from 'vitest'
import {
  adaptRepository,
  adaptExtendedRepository,
  adaptResource,
  adaptRepositories,
  adaptResources
} from '../lib/typeAdapters'

describe('typeAdapters', () => {
  describe('adaptRepository', () => {
    it('should convert bigint id to number', () => {
      const repo = { id: BigInt(123), name: 'Test Course' }
      const result = adaptRepository(repo)
      
      expect(result.id).toBe(123)
      expect(typeof result.id).toBe('number')
    })

    it('should handle optional fields', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course',
        credits: 3
      }
      const result = adaptRepository(repo)
      
      expect(result.name).toBe('Test Course')
      expect(result.credits).toBe(3)
      expect(result.code).toBeUndefined()
      expect(result.semester).toBeUndefined()
    })

    it('should convert nullable bigint fields', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course',
        semester_id: BigInt(456)
      }
      const result = adaptRepository(repo)
      
      expect(result.semester_id).toBe(456)
      expect(typeof result.semester_id).toBe('number')
    })

    it('should handle null semester_id', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course',
        semester_id: null
      }
      const result = adaptRepository(repo)
      
      expect(result.semester_id).toBeNull()
    })

    it('should set default credits', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course'
      }
      const result = adaptRepository(repo)
      
      expect(result.credits).toBe(0)
    })

    it('should convert grading_scale_id', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course',
        grading_scale_id: BigInt(1)
      }
      const result = adaptRepository(repo)
      
      expect(result.grading_scale_id).toBe(1)
    })
  })

  describe('adaptExtendedRepository', () => {
    it('should work same as adaptRepository for grades usage', () => {
      const repo = {
        id: BigInt(123),
        name: 'Test Course',
        code: 'CS101',
        credits: 3,
        semester_id: BigInt(456)
      }
      const result = adaptExtendedRepository(repo)
      
      expect(result.id).toBe(123)
      expect(result.name).toBe('Test Course')
      expect(result.code).toBe('CS101')
      expect(result.credits).toBe(3)
      expect(result.semester_id).toBe(456)
    })
  })

  describe('adaptResource', () => {
    it('should convert bigint ids to numbers', () => {
      const resource = {
        id: BigInt(123),
        repository_id: BigInt(456),
        title: 'Test Resource',
        type: 'pdf'
      }
      const result = adaptResource(resource)
      
      expect(result.id).toBe(123)
      expect(result.repository_id).toBe(456)
      expect(typeof result.id).toBe('number')
      expect(typeof result.repository_id).toBe('number')
    })

    it('should handle optional fields', () => {
      const resource = {
        id: BigInt(123),
        repository_id: BigInt(456),
        title: 'Test Resource',
        type: 'pdf'
      }
      const result = adaptResource(resource)
      
      expect(result.path).toBeUndefined()
      expect(result.content).toBeUndefined()
      expect(result.tags).toBeUndefined()
    })
  })

  describe('batch adaptation', () => {
    it('should adapt array of repositories', () => {
      const repos = [
        { id: BigInt(1), name: 'Course 1' },
        { id: BigInt(2), name: 'Course 2' }
      ]
      const results = adaptRepositories(repos)
      
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[0].name).toBe('Course 1')
      expect(results[1].id).toBe(2)
      expect(results[1].name).toBe('Course 2')
    })

    it('should adapt array of resources', () => {
      const resources = [
        { id: BigInt(1), repository_id: BigInt(10), title: 'Resource 1', type: 'pdf' },
        { id: BigInt(2), repository_id: BigInt(20), title: 'Resource 2', type: 'doc' }
      ]
      const results = adaptResources(resources)
      
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[0].repository_id).toBe(10)
      expect(results[0].title).toBe('Resource 1')
      expect(results[1].id).toBe(2)
      expect(results[1].repository_id).toBe(20)
      expect(results[1].title).toBe('Resource 2')
    })
  })
})