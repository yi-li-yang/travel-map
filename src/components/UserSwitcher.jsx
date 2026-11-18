export function UserSwitcher({ users, current, onChange }) {
  return (
    <div role="group" aria-label="Whose trips" className="panel pointer-events-auto mt-3 inline-flex gap-0.5 rounded-full p-0.5">
      {users.map((u) => {
        const active = u.id === current.id
        return (
          <button
            key={u.id}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onChange(u)}
            className={`h-11 rounded-full px-3.5 text-[13px] font-medium transition-colors md:h-8 ${
              active ? 'bg-white/[0.14] text-fg' : 'text-dim hover:bg-white/[0.07] hover:text-fg'
            }`}
          >
            {u.name}
          </button>
        )
      })}
    </div>
  )
}
