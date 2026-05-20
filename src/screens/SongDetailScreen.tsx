import { useEffect, useState } from 'react'
import { Screen } from '../components'
import { t, font, fontI, IMAP } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbPracticeLog } from '../lib/types'

type Song = { title: string; lastPracticed: string; sessions: number }
type Props = { song: Song; instrument: InstrumentId; onBack: () => void }

export function SongDetailScreen({ song, instrument, onBack }: Props) {
  const inst = IMAP[instrument]
  const { user } = useAuth()
  const [logs, setLogs] = useState<DbPracticeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('song_name', song.title)
      .order('practiced_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }, [user, song.title])

  const totalMin = logs.reduce((s, l) => s + l.duration_min, 0)

  return (
    <Screen>
      {/* ヘッダー */}
      <div style={{
        padding: '48px 18px 14px', background: t.bgCard,
        borderBottom: `1px solid ${t.border}`, marginBottom: 4,
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.accent, fontSize: 20, paddingBottom: 2 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.muted, marginBottom: 3, fontFamily: font }}>{inst.icon} {inst.label}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: t.text, fontFamily: font }}>{song.title}</div>
        </div>
      </div>

      {/* 統計3点 */}
      <div style={{ display: 'flex', gap: 8, margin: '10px 14px 0' }}>
        {[
          [logs.length + '回', '練習した'],
          [totalMin + '分', '合計時間'],
          [song.lastPracticed, '最後に'],
        ].map(([val, lb]) => (
          <div key={lb} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
            flex: 1, textAlign: 'center', padding: '12px 6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontFamily: fontI, fontSize: 17, color: t.accent, fontStyle: 'italic', lineHeight: 1.2 }}>{val}</div>
            <div style={{ fontSize: 9, color: t.muted, marginTop: 3, fontFamily: font }}>{lb}</div>
          </div>
        ))}
      </div>

      {/* タイムライン */}
      <div style={{ margin: '14px 14px 0' }}>
        <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 10 }}>練習の記録</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0' }}>読み込み中…</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0' }}>まだ記録がありません</div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom,${t.accentDim}60,${t.border})` }} />
            {logs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 8, position: 'relative' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: i === 0 ? t.accent : t.accentDim, border: `2px solid ${t.bg}`, marginTop: 7, flexShrink: 0, zIndex: 1 }} />
                <div style={{
                  background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
                  flex: 1, padding: 12, borderLeft: `2px solid ${i === 0 ? t.accent : t.border}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>
                      {log.practiced_at.slice(5).replace('-', '/')}
                    </span>
                    <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>{log.duration_min} min</span>
                  </div>
                  {log.memo && <div style={{ fontSize: 11, color: t.muted, marginBottom: 4, lineHeight: 1.5 }}>{log.memo}</div>}
                  {log.one_word && <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}
