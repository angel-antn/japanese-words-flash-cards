import { useLayoutEffect, useRef } from 'react'

/** Single-line text that shrinks its font only when it would overflow. */
export default function FitText({
  children,
  className = '',
}: {
  children: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.fontSize = '' // measure at the natural size first
      if (el.scrollWidth <= el.clientWidth) return
      const base = parseFloat(getComputedStyle(el).fontSize)
      el.style.fontSize = `${base * (el.clientWidth / el.scrollWidth)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])

  return (
    <span ref={ref} className={`block w-full min-w-0 whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}
