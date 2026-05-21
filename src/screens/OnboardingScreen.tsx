import { useState } from 'react'
import { t, font, INSTRUMENTS } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Props = {
  onComplete: (instrument: InstrumentId, name: string) => void
}

export function OnboardingScreen({ onComplete }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState<InstrumentId>('guitar')
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    if (!name.trim() || !user) return
    setSaving(true)
    await supabase.from('users').update({
      username: name.trim(),
      instrument,
      is_onboarded: true,
    }).eq('id', user.id)
    setSaving(false)
    onComplete(instrument, name.trim())
  }

  const inp = {
    width: '100%', background: t.bgCard, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '13px 16px', color: t.text,
    fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px', fontFamily: font, maxWidth: 390, margin: '0 auto',
    }}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>🎸</div>
        <div style={{ fontFamily: "'Kaisei Opti', serif", fontSize: 26, fontWeight: 700, color: t.accent, letterSpacing: '0.08em', marginBottom: 10 }}>
          軽音日記へようこそ
        </div>
        <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.8 }}>
          はじめに、ちょっとだけ教えてね。
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ニックネーム */}
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
            ニックネーム
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="例：ゆうき"
            maxLength={20}
            style={{ ...inp, border: `1px solid ${name ? t.accent : t.border}` }}
          />
        </div>

        {/* 担当楽器 */}
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
            担当楽器
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {INSTRUMENTS.map(inst => (
              <button
                key={inst.id}
                onClick={() => setInstrument(inst.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${instrument === inst.id ? t.accent : t.border}`,
                  background: instrument === inst.id ? t.accentBg : t.bgCard,
                  color: instrument === inst.id ? t.accent : t.muted,
                  fontSize: 13, transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{inst.icon}</span>
                <span style={{ fontFamily: font }}>{inst.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* はじめるボタン */}
        <button
          onClick={handleStart}
          disabled={saving || !name.trim()}
          style={{
            width: '100%', padding: 15, borderRadius: 12, border: 'none',
            background: name.trim() ? t.accent : t.dim,
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s', marginTop: 4,
          }}
        >
          {saving ? '設定中…' : 'はじめる →'}
        </button>
      </div>
    </div>
  )
}
