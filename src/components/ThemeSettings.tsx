import { exportData } from '../lib/storage'
import type { AppData, Theme } from '../lib/types'

const themes: Array<{ id: Theme; label: string; swatch: string }> = [
  { id: 'light', label: 'Light', swatch: '#f8f2ea' },
  { id: 'dark', label: 'Dark', swatch: '#101116' },
  { id: 'warm', label: 'Warm', swatch: '#fff7ed' },
  { id: 'ocean', label: 'Ocean', swatch: '#ecfeff' },
  { id: 'forest', label: 'Forest', swatch: '#f0fdf4' },
  { id: 'mono', label: 'Mono', swatch: '#f4f4f5' },
]

type ThemeSettingsProps = {
  data: AppData
  onChange: (data: AppData) => void
  onImport: (file: File) => Promise<void>
}

export function ThemeSettings({ data, onChange, onImport }: ThemeSettingsProps) {
  const setTheme = (theme: Theme) => {
    onChange({ ...data, settings: { ...data.settings, theme } })
  }

  const setAccent = (accentColor: string) => {
    onChange({ ...data, settings: { ...data.settings, accentColor } })
  }

  const clearAccent = () => {
    onChange({
      ...data,
      settings: {
        theme: data.settings.theme,
        activeTrackId: data.settings.activeTrackId,
      },
    })
  }

  return (
    <section className="settings-grid">
      <div className="card">
        <p className="eyebrow">Appearance</p>
        <h2>Theme</h2>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-swatch ${data.settings.theme === theme.id ? 'active' : ''}`}
              onClick={() => setTheme(theme.id)}
            >
              <span style={{ background: theme.swatch }} />
              {theme.label}
            </button>
          ))}
        </div>
        <label className="accent-picker">
          Accent color
          <input type="color" value={data.settings.accentColor ?? '#7c3aed'} onChange={(e) => setAccent(e.target.value)} />
        </label>
        <p className="muted-text">Hobby colors stay independent. Accent affects buttons and highlights.</p>
        {data.settings.accentColor && (
          <button type="button" className="ghost" onClick={clearAccent}>
            Reset accent to theme default
          </button>
        )}
      </div>
      <div className="card">
        <p className="eyebrow">Local data</p>
        <h2>JSON backup</h2>
        <p>The desktop app keeps its main data file in your Windows app data folder. Use export/import for manual backups or moving machines.</p>
        <div className="button-row">
          <button type="button" onClick={() => exportData(data)}>
            Export JSON
          </button>
          <label className="file-button">
            Import JSON
            <input
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (file) {
                  await onImport(file)
                  event.target.value = ''
                }
              }}
            />
          </label>
        </div>
      </div>
    </section>
  )
}
