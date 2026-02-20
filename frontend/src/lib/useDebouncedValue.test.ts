/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('returns the previous value until debounce delay elapses', () => {
    vi.useFakeTimers()

    const { result, rerender } = renderHook(
      ({ value, delayMs }: { value: string; delayMs: number }) => useDebouncedValue(value, delayMs),
      {
        initialProps: { value: 'alpha', delayMs: 120 },
      },
    )

    expect(result.current).toBe('alpha')

    rerender({ value: 'beta', delayMs: 120 })
    expect(result.current).toBe('alpha')

    act(() => {
      vi.advanceTimersByTime(119)
    })
    expect(result.current).toBe('alpha')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('beta')
  })

  it('cancels pending updates when value changes again before delay', () => {
    vi.useFakeTimers()

    const { result, rerender } = renderHook(
      ({ value, delayMs }: { value: string; delayMs: number }) => useDebouncedValue(value, delayMs),
      {
        initialProps: { value: 'first', delayMs: 100 },
      },
    )

    rerender({ value: 'second', delayMs: 100 })
    act(() => {
      vi.advanceTimersByTime(60)
    })

    rerender({ value: 'third', delayMs: 100 })
    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('third')
  })
})
