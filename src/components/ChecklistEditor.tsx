import { useState } from 'react'
import type { ChecklistItem } from '../lib/types'

type ChecklistEditorProps = {
  items: ChecklistItem[]
  compact?: boolean
  onAdd: (text: string) => void
  onToggle: (itemId: string) => void
  onRemove: (itemId: string) => void
}

export function ChecklistEditor({ items, compact, onAdd, onToggle, onRemove }: ChecklistEditorProps) {
  const [text, setText] = useState('')
  const doneCount = items.filter((item) => item.done).length

  const handleAdd = () => {
    if (!text.trim()) {
      return
    }
    onAdd(text)
    setText('')
  }

  return (
    <div className={`checklist ${compact ? 'compact' : ''}`}>
      <div className="checklist-header">
        <span>Block goals</span>
        <strong>
          {doneCount}/{items.length} done
        </strong>
      </div>
      <div className="checklist-items">
        {items.length === 0 && <p className="muted-text">Add goals for this block.</p>}
        {items.map((item) => (
          <label className="checklist-item" key={item.id}>
            <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} />
            <span className={item.done ? 'done' : ''}>{item.text}</span>
            <button type="button" className="ghost small" onClick={() => onRemove(item.id)}>
              Remove
            </button>
          </label>
        ))}
      </div>
      <div className="checklist-add">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Goal for this block..."
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleAdd()
            }
          }}
        />
        <button type="button" onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  )
}
