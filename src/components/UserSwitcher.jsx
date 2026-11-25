export function UserSwitcher({ users, current, onChange }) {
  return (
    <div role="group" aria-label="Whose trips" className="panel pointer-events-auto mt-3 inline-flex">
      {users.map((u) => {
        const active = u.id === current.id
        return (
          <button
            key={u.id}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onChange(u)}
            className={`h-11 px-3 text-[14px] font-medium transition-colors duration-fast ease-out md:h-8 ${
              active ? 'bg-ground text-ink ring-1 ring-inset ring-edge' : 'text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            {u.name}
          </button>
        )
      })}
    </div>
  )
}
