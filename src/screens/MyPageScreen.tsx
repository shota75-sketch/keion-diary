import { useState, useEffect } from 'react'
import { Screen, Header, Card } from '../components'
import { t, font, fontI, INSTRUMENTS, IMAP } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbUser } from '../lib/types'

const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const
const inp = {
  width: '100%', background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: '10px 12px', color: t.text,
  fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}

type Props = {
  onProfileLoad: (instrument: InstrumentId, name: string) => void
}

export function MyPageScreen({ onProfileLoad }: Props) {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<DbUser | null>(null)
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState<InstrumentId>('guitar')
  const [goalMin, setGoalMin] = useState('600')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setName(data.username)
      setInstrument(data.instrument as InstrumentId)
      setGoalMin(String(data.goal_min_monthly))
      onProfileLoad(data.instrument as InstrumentId, data.username)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('users').update({
      username: name,
      instrument,
      goal_min_monthly: parseInt(goalMin) || 600,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    onProfileLoad(instrument, name)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopy = () => {
    if (!profile?.friend_code) return
    navigator.clipboard.writeText(profile.friend_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Screen>
      <Header title="マイページ" />

      {/* アイコン＋ニックネーム */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: t.accentBg, border: `2px solid ${t.accentDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
          {IMAP[instrument]?.icon || '🎵'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>ニックネーム</div>
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, fontSize: 15 }} />
        </div>
      </Card>

      {/* 担当楽器 */}
      <Card>
        <div style={lbl}>担当楽器</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {INSTRUMENTS.map(inst => (
            <button key={inst.id} onClick={() => setInstrument(inst.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
              border: `1px solid ${instrument === inst.id ? t.accent : t.border}`,
              background: instrument === inst.id ? t.accentBg : t.bgInput,
              color: instrument === inst.id ? t.accent : t.muted,
              fontSize: 12,
            }}>
              <span>{inst.icon}</span><span style={{ fontFamily: font }}>{inst.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 目標練習時間 */}
      <Card>
        <div style={lbl}>今月の目標練習時間</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="number" value={goalMin} onChange={e => setGoalMin(e.target.value)} style={{
            ...inp, width: 86, textAlign: 'center',
            fontFamily: fontI, fontSize: 22, color: t.accent, fontStyle: 'italic',
          }} />
          <span style={{ fontSize: 13, color: t.muted, fontFamily: font }}>分 / 月</span>
          <span style={{ fontSize: 10, color: t.muted, marginLeft: 'auto', fontFamily: font }}>約{Math.round(Number(goalMin) / 30)}分/日</span>
        </div>
      </Card>

      {/* フレンドコード */}
      {profile?.friend_code && (
        <Card>
          <div style={lbl}>マイフレンドコード</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: fontI, fontSize: 22, color: t.accent, fontStyle: 'italic', letterSpacing: '0.06em', flex: 1 }}>{profile.friend_code}</div>
            <button onClick={handleCopy} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: copied ? t.green : t.bgInput, color: copied ? '#fff' : t.muted, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>
              {copied ? '✓' : 'コピー'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: t.muted, marginTop: 6, fontFamily: font }}>このコードを友達に教えると部室に招待できます</div>
        </Card>
      )}

      {/* アカウント */}
      <Card>
        <div style={lbl}>アカウント</div>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 10 }}>{user?.email}</div>
        <button onClick={signOut} style={{ width: '100%', padding: 11, borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgInput, color: t.muted, fontSize: 12, cursor: 'pointer' }}>
          サインアウト
        </button>
      </Card>

      <div style={{ padding: '6px 14px 24px' }}>
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: 13, borderRadius: 9, border: 'none',
          background: saved ? t.green : t.accent,
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
        }}>{saving ? '保存中…' : saved ? '✓ 保存した' : '保存する'}</button>
      </div>
    </Screen>
  )
}
