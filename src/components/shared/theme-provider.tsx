'use client'
import { ThemeProvider as NextThemes } from 'next-themes'
export function ThemeProvider({ children, attribute, defaultTheme }) {
  return (
    <NextThemes attribute={attribute} defaultTheme={defaultTheme} enableSystem={false}>
      {children}
    </NextThemes>
  )
}
