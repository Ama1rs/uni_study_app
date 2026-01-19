import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonCard, SkeletonTable } from './Skeleton'

describe('Skeleton', () => {
  describe('Skeleton component', () => {
    it('should render text variant by default', () => {
      const { container } = render(<Skeleton />)
      const skeleton = container.querySelector('.space-y-2')
      expect(skeleton).toBeInTheDocument()
    })

    it('should render correct number of lines', () => {
      render(<Skeleton lines={3} />)
      const { container } = render(<Skeleton lines={3} />)
      const skeleton = container.querySelector('.space-y-2')
      expect(skeleton?.children).toHaveLength(3)
    })

    it('should render circular variant', () => {
      const { container } = render(<Skeleton variant="circular" width={50} height={50} />)
      const skeleton = container.querySelector('.animate-pulse.rounded-full')
      expect(skeleton).toBeInTheDocument()
    })

    it('should render rectangular variant', () => {
      const { container } = render(<Skeleton variant="rectangular" width={100} height={50} />)
      const skeleton = container.querySelector('.animate-pulse.rounded-md')
      expect(skeleton).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />)
      const skeleton = container.querySelector('.space-y-2.custom-class')
      expect(skeleton).toBeInTheDocument()
    })
  })

  describe('SkeletonCard', () => {
    it('should render card skeleton structure', () => {
      const { container } = render(<SkeletonCard />)
      const card = container.querySelector('.bg-white.dark\\:bg-gray-800.rounded-lg.p-6')
      expect(card).toBeInTheDocument()
    })

    it('should apply custom className to card', () => {
      const { container } = render(<SkeletonCard className="custom-card" />)
      const card = container.querySelector('.custom-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('SkeletonTable', () => {
    it('should render table with default rows and columns', () => {
      const { container } = render(<SkeletonTable />)
      const table = container.querySelector('.space-y-2')
      expect(table?.children).toHaveLength(6) // header + 5 rows
    })

    it('should render custom number of rows and columns', () => {
      const { container } = render(<SkeletonTable rows={3} columns={2} />)
      const table = container.querySelector('.space-y-2')
      
      // Should have header row + 3 data rows
      expect(table?.children).toHaveLength(4)
      
      // Header should have 2 columns
      expect(table?.children[0].children).toHaveLength(2)
      
      // Each data row should have 2 columns
      for (let i = 1; i <= 3; i++) {
        expect(table?.children[i].children).toHaveLength(2)
      }
    })

    it('should apply custom className to table', () => {
      const { container } = render(<SkeletonTable className="custom-table" />)
      const table = container.querySelector('.space-y-2.custom-table')
      expect(table).toBeInTheDocument()
    })
  })
})