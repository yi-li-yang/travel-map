// Square buttons. `primary` is the one filled button of a view, in the accent; the rest stay neutral.
const VARIANTS = {
  primary: 'bg-signal text-ground font-semibold hover:brightness-110',
  ghost: 'border border-edge text-ink hover:bg-surface',
  quiet: 'text-muted hover:text-ink hover:bg-surface',
}

const SIZES = {
  md: 'h-11 md:h-10 px-4 text-[14px] gap-2',
  sm: 'h-9 px-3 text-[14px] gap-2',
  icon: 'h-11 w-11 md:h-10 md:w-10 justify-center',
  iconSm: 'h-9 w-9 justify-center',
}

export function Button({ variant = 'ghost', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 select-none items-center font-medium transition duration-fast ease-out disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
