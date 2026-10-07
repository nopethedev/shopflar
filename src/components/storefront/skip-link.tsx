'use client'

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-md focus:bg-foreground focus:text-background focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}
