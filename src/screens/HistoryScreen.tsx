import { useEffect, useState } from 'react'
import { Screen, Header, Card } from '../components'
import { t, font, fontI } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbPracticeLog } from '../lib/types'
import { calcStreak } from '../lib/types'

const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const

export function HistoryScreen() {
  const { user } = useAuth()
  const [view, setView] = useState<'calendar' | 'history'>('calendar')
  const [sel, setSel] = useState<number | null>(null)
  const [monthLogs, setMonthLogs] = useState<DbPracticeLog[]>([])
  const [allLogs, setAllLogs] = useState<DbPracticeLog[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  // 月曜始まりに変換
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    const { data: mLogs } = await supabase
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('practiced_at', monthStart)
      .lte('practiced_at', monthEnd)
      .order('practiced_at', { ascending: false })
    setMonthLogs(mLogs ?? [])

    const { data: aLogs } = await supabase
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
    setAllLogs(aLogs ?? [])

    setLoading(false)
  }

  // 練習した日付のSet（日だけ）
  const practicedDays = new Set(
    monthLogs.map(l => parseInt(l.practiced_at.slice(8, 10)))
  )

  // その日のログ（複数件すべて取得）
  const getSelLogs = (day: number) =>
    monthLogs.filter(l => parseInt(l.practiced_at.slice(8, 10)) === day)

  // 月間統計
  const monthCount = new Set(monthLogs.map(l => l.practiced_at)).size
  const monthMin = monthLogs.reduce((s, l) => s + l.duration_min, 0)
  const streak = calcStreak(allLogs.map(l => l.practiced_at))

  const days = ['月', '火', '水', '木', '金', '土', '日']

  return (
    <Screen>
      <Header sub={`${year}年 ${month}月`} title="練習の記録" />

      {/* 統計3点 */}
      <div style={{ display: 'flex', gap: 8, margin: '10px 14px 0' }}>
        {[[`${monthCount}回`, '今月'], [`${monthMin}分`, '合計'], [`${streak}日`, '連続']].map(([val, lb]) => (
          <div key={lb} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
            flex: 1, textAlign: 'center', padding: '12px 6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontFamily: fontI, fontSize: 18, color: t.accent, fontStyle: 'italic' }}>{val}</div>
            <div style={{ fontSize: 9, color: t.muted, marginTop: 2, fontFamily: font }}>{lb}</div>
          </div>
        ))}
      </div>

      {/* カレンダー / 履歴 切り替え */}
      <Card style={{ display: 'flex', gap: 5, padding: 5 }}>
        {([['calendar', '📅 カレンダー'], ['history', '📖 履歴']] as const).map(([v, label]) => (
          <button key={v} onClick={() => { setView(v); setSel(null) }} style={{
            flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: view === v ? t.accent : t.bgInput,
            color: view === v ? '#fff' : t.muted,
            fontSize: 12, fontWeight: view === v ? 600 : 400,
          }}>{label}</button>
        ))}
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '32px 0' }}>読み込み中…</div>
      ) : view === 'calendar' ? (
        <>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
              {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: t.muted, paddingBottom: 3 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const done = practicedDays.has(day)
                return (
                  <div key={day} onClick={() => done && setSel(sel === day ? null : day)} style={{
                    aspectRatio: '1', borderRadius: 5,
                    background: done ? t.green : t.bgInput,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: done ? '#fff' : t.dim, fontFamily: font,
                    cursor: done ? 'pointer' : 'default',
                    border: sel === day ? `2px solid ${t.accent}` : '1px solid transparent',
                    transform: sel === day ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.12s',
                  }}>{day}</div>
                )
              })}
            </div>
          </Card>

          {sel !== null && (() => {
            const selLogs = getSelLogs(sel)
            return selLogs.length > 0 ? (
              <>
                {selLogs.map((log, li) => (
                  <Card key={log.id} style={{ borderLeft: `2px solid ${li === 0 ? t.accent : t.accentDim}` }}>
                    {li === 0 && <div style={{ ...lbl, marginBottom: 8 }}>{month}月{sel}日（{selLogs.length}件）</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: t.muted, background: t.accentBg, padding: '1px 8px', borderRadius: 8, border: `1px solid ${t.accentDim}` }}>
                          {log.type === 'song' ? '曲練習' : '基礎練'}
                        </span>
                        <span style={{ fontSize: 12, color: t.text }}>
                          {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                        </span>
                        {log.bpm && (
                          <span style={{ fontSize: 9, color: t.muted, background: t.bgSub, padding: '1px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontFamily: font }}>bpm: {log.bpm}</span>
                        )}
                      </div>
                      <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>{log.duration_min} min</span>
                    </div>
                    {log.memo && <div style={{ fontSize: 11, color: t.muted, marginBottom: 4, lineHeight: 1.4 }}>{log.memo}</div>}
                    {log.one_word && <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>}
                  </Card>
                ))}
              </>
            ) : (
              <Card style={{ textAlign: 'center', color: t.muted, fontSize: 12 }}>この日は練習なし</Card>
            )
          })()}
          {sel === null && (
            <div style={{ textAlign: 'center', color: t.dim, fontSize: 11, padding: '14px 0' }}>日付をタップすると詳細を表示</div>
          )}
        </>
      ) : (
        <div style={{ margin: '8px 14px 0', position: 'relative' }}>
          {allLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0' }}>まだ練習記録がありません</div>
          ) : (
            <>
              <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom,${t.accentDim}60,${t.border})` }} />
              {allLogs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: i === 0 ? t.accent : t.accentDim, border: `2px solid ${t.bg}`, marginTop: 7, flexShrink: 0, zIndex: 1 }} />
                  <div style={{
                    background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
                    flex: 1, padding: 12, borderLeft: `2px solid ${i === 0 ? t.accent : t.border}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: t.muted }}>{log.practiced_at.slice(5).replace('-', '/')}</span>
                        <span style={{ fontSize: 10, color: t.muted, background: t.accentBg, padding: '1px 7px', borderRadius: 7, border: `1px solid ${t.accentDim}` }}>
                          {log.type === 'song' ? '曲練習' : '基礎練'}
                        </span>
                        <span style={{ fontSize: 12, color: t.text }}>
                          {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                        </span>
                        {log.bpm && (
                          <span style={{ fontSize: 9, color: t.muted, background: t.bgSub, padding: '1px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontFamily: font }}>bpm: {log.bpm}</span>
                        )}
                      </div>
                      <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>{log.duration_min} min</span>
                    </div>
                    {log.one_word && <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </Screen>
  )
}
