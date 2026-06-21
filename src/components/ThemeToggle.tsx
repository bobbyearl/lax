import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

const options = [
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex rounded border-2 border-border shadow-md overflow-hidden">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`h-8 w-8 flex items-center justify-center text-xs transition-colors ${
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'bg-input hover:bg-accent'
          }`}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
