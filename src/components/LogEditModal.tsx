import { useState } from 'react'
import { t, font, fontI } from '../theme'
import { supabase } from '../lib/supabase'
import type { DbPracticeLog } from '../lib/types'

type Props = {
  log: DbPracticeLog
  onSaved: () => void
  onClose: () => void
}

const inp = {
  width: '100%', background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: '10px 12px', color: t.text,
  fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}
const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const

export function LogEditModal({ log, onSaved, onClose }: Props) {
  const [practicedAt, setPracticedAt] = useState(log.practiced_at)
  const [durationMin, setDurationMin] = useState(String(log.duration_min))
  const [bpm, setBpm] = useState(log.bpm ? String(log.bpm) : '')
  const [memo, setMemo] = useState(log.memo ?? '')
  const [oneWord, setOneWord] = useState(log.one_word ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('practice_logs').update({
      practiced_at: practicedAt,
      duration_min: parseInt(durationMin) || log.duration_min,
      bpm: bpm ? parseInt(bpm) : null,
      memo: memo || null,
      one_word: oneWord || null,
    }).eq('id', log.id)
    onSaved()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: t.bgCard, borderRadius: '14px 14px 0 0', padding: '20px 18px 36px', width: '100%', maxWidth: 390, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: font }}>練習記録を編集</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>練習日</div>
          <input type="date" value={practicedAt} onChange={e => setPracticedAt(e.target.value)}
            style={{ ...inp, colorScheme: 'light' as const }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>練習時間（分）</div>
            <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)}
              style={{ ...inp, textAlign: 'center', fontFamily: fontI, fontSize: 18, color: t.accent, fontStyle: 'italic' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>BPM（任意）</div>
            <input type="number" value={bpm} onChange={e => setBpm(e.target.value)}
              placeholder="—"
              style={{ ...inp, textAlign: 'center', fontFamily: fontI, fontSize: 18, color: t.accent, fontStyle: 'italic' }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>メモ（任意）</div>
          <input value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="今日できたこと…" style={inp} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={lbl}>ひとこと（任意）</div>
          <input value={oneWord} onChange={e => setOneWord(e.target.value)}
            placeholder="今日のひとこと…"
            style={{ ...inp, fontFamily: fontI, fontStyle: 'italic' }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: 13, borderRadius: 9, border: 'none',
          background: t.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>{saving ? '保存中…' : '保存する'}</button>
      </div>
    </div>
  )
}
