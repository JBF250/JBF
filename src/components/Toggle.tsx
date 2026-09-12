interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`relative inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-12 h-7 bg-theme-tertiary border border-theme-color rounded-full peer-checked:bg-primary peer-checked:border-primary transition-all duration-300 after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-theme-secondary after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
      {label && <span className="text-theme-primary text-sm">{label}</span>}
    </label>
  )
}
