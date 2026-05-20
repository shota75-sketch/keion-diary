import { useState, useEffect, useRef } from 'react'
import { Screen, Header, Card } from '../components'
import { t, font, fontI, IMAP, HINTS } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Props = { instrument: InstrumentId }

const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const
const inp = {
  width: '100%', background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: '10px 12px', color: t.text,
  fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}

export function RecordScreen({ instrument }: Props) {
  const { user } = useAuth()
  const [type, setType] = useState<'basic' | 'song'>('basic')
  const [detail, setDetail] = useState('')
  const [song, setSong] = useState('')
  const [newSongMode, setNewSongMode] = useState(false)
  const [newSongTitle, setNewSongTitle] = useState('')
  const [songs, setSongs] = useState<string[]>([])
  const [timeMode, setTimeMode] = useState<'stopwatch' | 'manual'>('stopwatch')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [manualMin, setManualMin] = useState('')
  const [memo, setMemo] = useState('')
  const [word, setWord] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inst = IMAP[instrument]

  useEffect(() => {
    loadSongs()
  }, [user])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const loadSongs = async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_songs')
      .select('title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSongs((data ?? []).map(s => s.title))
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const getDurationMin = () => {
    if (timeMode === 'stopwatch') return Math.ceil(elapsed / 60)
    return parseInt(manualMin) || 0
  }

  const handleAddNewSong = async () => {
    if (!newSongTitle.trim() || !user) return
    const title = newSongTitle.trim()
    // すでに存在しなければ追加
    if (!songs.includes(title)) {
      await supabase.from('user_songs').insert({ user_id: user.id, title })
      setSongs(prev => [title, ...prev])
    }
    setSong(title)
    setNewSongMode(false)
    setNewSongTitle('')
  }

  const handleSave = async () => {
    if (!user) return
    const durationMin = getDurationMin()
    if (durationMin === 0) return

    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)

    await supabase.from('practice_logs').insert({
      user_id: user.id,
      type,
      detail: type === 'basic' ? detail : '',
      song_name: type === 'song' ? song : '',
      duration_min: durationMin,
      memo,
      one_word: word,
      practiced_at: today,
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setRunning(false)
    setElapsed(0)
    setManualMin('')
    setDetail('')
    setSong('')
    setMemo('')
    setWord('')
  }

  return (
    <Screen>
      <Header sub={`${inst.icon} ${inst.label} — 今日何弾いた？`} title="練習を記録する" />

      {/* 基礎練 / 曲練習 */}
      <Card style={{ display: 'flex', gap: 6, padding: 5 }}>
        {([['basic', '🎵 基礎練'], ['song', '🎶 曲練習']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setType(v)} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: type === v ? t.accent : t.bgInput,
            color: type === v ? '#fff' : t.muted,
            fontSize: 13, fontWeight: type === v ? 600 : 400,
          }}>{label}</button>
        ))}
      </Card>

      {type === 'basic' ? (
        <Card>
          <div style={lbl}>何を練習した？（任意）</div>
          <input value={detail} onChange={e => setDetail(e.target.value)}
            placeholder={HINTS[instrument]}
            style={{ ...inp, border: `1px solid ${detail ? t.accent : t.border}` }} />
        </Card>
      ) : (
        <Card>
          <div style={lbl}>曲を選ぶ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {songs.map(sg => (
              <button key={sg} onClick={() => { setSong(song === sg ? '' : sg); setNewSongMode(false) }} style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                border: `1px solid ${song === sg ? t.accent : t.border}`,
                background: song === sg ? t.accentBg : t.bgInput,
                color: song === sg ? t.accent : t.text,
                fontSize: 13, cursor: 'pointer',
              }}>{sg}</button>
            ))}
            {/* 新しい曲を追加 */}
            {!newSongMode ? (
              <button onClick={() => setNewSongMode(true)} style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                border: `1px solid ${t.border}`, background: 'transparent',
                color: t.muted, fontSize: 13, cursor: 'pointer',
              }}>+ 新しい曲を追加</button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newSongTitle}
                  onChange={e => setNewSongTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNewSong()}
                  placeholder="曲名を入力"
                  autoFocus
                  style={{ ...inp, flex: 1, border: `1px solid ${t.accent}` }}
                />
                <button onClick={handleAddNewSong} style={{
                  padding: '10px 14px', borderRadius: 8, border: 'none',
                  background: t.accent, color: '#fff', fontSize: 13, cursor: 'pointer', flexShrink: 0,
                }}>追加</button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 練習時間 */}
      <Card style={{ padding: 12 }}>
        <div style={lbl}>練習時間</div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {([['stopwatch', '⏱ 計測'], ['manual', '✏️ 手入力']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => { setTimeMode(mode); setRunning(false); setElapsed(0) }} style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              border: `1px solid ${timeMode === mode ? t.accent : t.border}`,
              background: timeMode === mode ? t.accentBg : 'transparent',
              color: timeMode === mode ? t.accent : t.muted,
              fontSize: 12, cursor: 'pointer', fontWeight: timeMode === mode ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>

        {timeMode === 'stopwatch' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: fontI, fontSize: 52, letterSpacing: '0.04em', color: running ? t.accent : t.text, fontStyle: 'italic', transition: 'color 0.3s' }}>{fmt(elapsed)}</div>
            <div style={{ fontSize: 9, color: t.muted, letterSpacing: '0.1em', marginBottom: 14, fontFamily: font }}>STOPWATCH</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setRunning(!running)} style={{
                padding: '11px 28px', borderRadius: 24,
                border: `1px solid ${running ? t.accentDim : t.accent}`,
                background: running ? 'transparent' : t.accent,
                color: running ? t.accent : '#fff',
                fontSize: 13, cursor: 'pointer',
              }}>{running ? '⏸ 止める' : elapsed > 0 ? '▶ 再開' : '▶ 始める'}</button>
              {elapsed > 0 && !running && (
                <button onClick={() => setElapsed(0)} style={{
                  padding: '11px 14px', borderRadius: 24,
                  border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.muted, fontSize: 13, cursor: 'pointer',
                }}>↺</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" value={manualMin} onChange={e => setManualMin(e.target.value)} placeholder="0" style={{
              width: 76, background: t.bgInput,
              border: `1px solid ${manualMin ? t.accent : t.border}`,
              borderRadius: 8, padding: 10, color: t.accent,
              fontFamily: fontI, fontSize: 28, fontStyle: 'italic',
              outline: 'none', textAlign: 'center', boxSizing: 'border-box',
            }} />
            <div style={{ fontSize: 14, color: t.text, fontFamily: font }}>分</div>
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              {[10, 20, 30, 60].map(m => (
                <button key={m} onClick={() => setManualMin(String(m))} style={{
                  padding: '5px 8px', borderRadius: 7,
                  border: `1px solid ${manualMin === String(m) ? t.accent : t.border}`,
                  background: manualMin === String(m) ? t.accentBg : 'transparent',
                  color: manualMin === String(m) ? t.accent : t.muted,
                  fontSize: 11, cursor: 'pointer',
                }}>{m}</button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div style={lbl}>今日できたこと（任意）</div>
        <textarea value={memo} onChange={e => setMemo(e.target.value)}
          placeholder="少しだけ上手くなった気がするとか、全然ダメだったとか…"
          style={{ ...inp, resize: 'none', minHeight: 64, lineHeight: 1.6 }} />
      </Card>

      <Card>
        <div style={lbl}>今日のひとこと</div>
        <input value={word} onChange={e => setWord(e.target.value)}
          placeholder="一言だけ"
          style={{ ...inp, fontFamily: fontI, fontStyle: 'italic' }} />
      </Card>

      <div style={{ padding: '6px 14px 24px' }}>
        <button onClick={handleSave} disabled={saving || getDurationMin() === 0} style={{
          width: '100%', padding: 14, borderRadius: 10, border: 'none',
          background: saved ? t.green : getDurationMin() === 0 ? t.dim : t.accent,
          color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: getDurationMin() === 0 ? 'default' : 'pointer',
          transition: 'all 0.3s',
        }}>{saving ? '保存中…' : saved ? '✓ 記録した' : '記録する'}</button>
        {getDurationMin() === 0 && (
          <div style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: 8 }}>
            練習時間を入力してください
          </div>
        )}
      </div>
    </Screen>
  )
}
