'use client'
import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

/**
 * Input for API keys, tokens and other credentials.
 *
 * Why this is not `type="password"`: Chrome (and most password managers) treat
 * any password field as a login form. They autofill the saved password into
 * the key field and drop the saved *username* into the nearest preceding text
 * field — e.g. the admin search box. A masked `type="text"` input avoids the
 * heuristic entirely, so nothing gets filled in.
 *
 * The extra attributes opt out of Chrome, 1Password, LastPass, Bitwarden and
 * Dashlane. The field is also read-only until focused, which stops Chrome's
 * page-load autofill from touching it.
 */
export const NO_AUTOFILL_PROPS = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const

type Props = Omit<React.ComponentProps<'input'>, 'type'> & {
  /** Show the reveal/hide toggle (default true). */
  revealable?: boolean
}

export const SecretInput = React.forwardRef<HTMLInputElement, Props>(function SecretInput(
  { className, revealable = true, name, id, onFocus, readOnly, ...props },
  ref
) {
  const [visible, setVisible] = React.useState(false)
  const [armed, setArmed] = React.useState(false)
  const autoId = React.useId()

  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        type="text"
        id={id}
        // Unique, non-credential-looking name so saved-form matching misses.
        name={name || `secret-${autoId.replace(/:/g, '')}`}
        {...NO_AUTOFILL_PROPS}
        readOnly={readOnly || !armed}
        onFocus={(e) => {
          setArmed(true)
          onFocus?.(e)
        }}
        style={visible ? undefined : ({ WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties)}
        className={cn(revealable && 'pr-9', className)}
        {...props}
      />
      {revealable && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          aria-label={visible ? 'Hide value' : 'Show value'}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )
})
