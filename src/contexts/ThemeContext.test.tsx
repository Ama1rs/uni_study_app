import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('should initialize with default values', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.mode).toBe('dark')
    expect(result.current.theme).toBe('default')
    expect(result.current.accent).toBe('blue')
    expect(result.current.customBg).toBeNull()
    expect(result.current.customSurface).toBeNull()
    expect(result.current.highContrast).toBe(false)
  })

  it('should toggle theme mode', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleMode()
    })

    expect(result.current.mode).toBe('light')

    act(() => {
      result.current.toggleMode()
    })

    expect(result.current.mode).toBe('dark')
  })

  it('should set theme', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('warm')
    })

    expect(result.current.theme).toBe('warm')
  })

  it('should set accent color', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setAccent('green')
    })

    expect(result.current.accent).toBe('green')
  })

  it('should set custom background color', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setCustomBg('#ffffff')
    })

    expect(result.current.customBg).toBe('#ffffff')
  })

  it('should set high contrast', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setHighContrast(true)
    })

    expect(result.current.highContrast).toBe(true)
  })

  it('should load saved values from localStorage', () => {
    // Set values in localStorage before rendering
    localStorage.setItem('theme_mode', 'light')
    localStorage.setItem('theme_style', 'warm')
    localStorage.setItem('theme_accent', 'red')
    localStorage.setItem('theme_custom_bg', '#000000')
    localStorage.setItem('theme_custom_surface', '#111111')
    localStorage.setItem('theme_high_contrast', 'true')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.mode).toBe('light')
    expect(result.current.theme).toBe('warm')
    expect(result.current.accent).toBe('red')
    expect(result.current.customBg).toBe('#000000')
    expect(result.current.customSurface).toBe('#111111')
    expect(result.current.highContrast).toBe(true)
  })

  it('should persist values to localStorage', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('warm')
      result.current.setAccent('green')
      result.current.setCustomBg('#ffffff')
      result.current.setHighContrast(true)
    })

    expect(localStorage.getItem('theme_mode')).toBe('dark') // Default value
    expect(localStorage.getItem('theme_style')).toBe('warm')
    expect(localStorage.getItem('theme_accent')).toBe('green')
    expect(localStorage.getItem('theme_custom_bg')).toBe('#ffffff')
    expect(localStorage.getItem('theme_high_contrast')).toBe('true')
  })
})