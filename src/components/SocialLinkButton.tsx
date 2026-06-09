import type { CSSProperties, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SocialLinkButtonProps = {
  href: string
  label: string
  id?: string
  ariaLabel?: string
  style?: CSSProperties
  className?: string
  children?: ReactNode
}

export default function SocialLinkButton({
  href,
  label,
  id,
  ariaLabel,
  style,
  className,
  children,
}: SocialLinkButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(
        'brand-social-link mx-auto h-auto w-full cursor-pointer rounded-xl border border-solid px-5 py-4 text-lg font-semibold tracking-normal text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-[1.04] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:brightness-95',
        className,
      )}
    >
      <a
        href={href}
        id={id}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel ?? label}
        style={style}
      >
        <span className="flex w-full items-center">
          <span className="flex w-9 shrink-0 items-center justify-center">
            {children}
          </span>
          <span className="flex-1 pl-2 text-center leading-snug font-semibold wrap-break-word whitespace-normal">
            {label}
          </span>
          <span className="w-9 shrink-0" />
        </span>
      </a>
    </Button>
  )
}
