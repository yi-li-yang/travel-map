const VARIANTS = {
  primary: 'bg-route text-space font-semibold hover:bg-white active:bg-route',
  ghost: 'bg-white/[0.06] text-fg hover:bg-white/[0.11] active:bg-white/[0.06]',
  quiet: 'text-dim hover:text-fg hover:bg-white/[0.07]',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
}

const SIZES = {
  md: 'h-11 md:h-10 px-4 rounded-xl text-[14px] gap-2',
  sm: 'h-9 px-3 rounded-lg text-[13px] gap-1.5',
  icon: 'h-11 w-11 md:h-10 md:w-10 rounded-xl justify-center',
  iconSm: 'h-9 w-9 rounded-lg justify-center',
}

export function Button({ variant = 'ghost', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 select-none items-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
