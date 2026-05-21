import { useEffect, useState, useRef } from 'react'
import { Screen, Header, Card, LogEditModal } from '../components'
import { t, font, fontI } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbPracticeLog } from '../lib/types'
import { calcStreak } from '../lib/types'

const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const

export function HistoryScreen() {
  const { user } = useAuth()
  const now = new Date()
  const [view, setView] = useState<'calendar' | 'history'>('calendar')
  const [sel, setSel] = useState<number | null>(null)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [monthLogs, setMonthLogs] = useState<DbPracticeLog[]>([])
  const [streakDates, setStreakDates] = useState<string[]>([])
  const [historyLogs, setHistoryLogs] = useState<DbPracticeLog[]>([])
  const [historyOffset, setHistoryOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuLogId, setMenuLogId] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<DbPracticeLog | null>(null)
  const [deleteLogTarget, setDeleteLogTarget] = useState<DbPracticeLog | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 20

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1

  const prevMonth = () => {
    setSel(null)
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (isCurrentMonth) return
    setSel(null)
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, viewYear, viewMonth])

  useEffect(() => {
    if (!user) return
    reloadHistory()
  }, [user])

  useEffect(() => {
    if (view !== 'history' || !hasMore || loadingMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadHistoryPage(historyOffset)
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [view, hasMore, loadingMore, historyOffset, user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const yStr = String(viewYear)
    const mStr = String(viewMonth).padStart(2, '0')
    const monthStart = `${yStr}-${mStr}-01`
    const monthEnd   = `${yStr}-${mStr}-${String(daysInMonth).padStart(2, '0')}`

    const [{ data: mLogs }, { data: allDates }] = await Promise.all([
      supabase
        .from('practice_logs').select('*')
        .eq('user_id', user.id)
        .gte('practiced_at', monthStart).lte('practiced_at', monthEnd)
        .order('practiced_at', { ascending: false }),
      supabase
        .from('practice_logs').select('practiced_at')
        .eq('user_id', user.id),
    ])
    setMonthLogs(mLogs ?? [])
    setStreakDates((allDates ?? []).map(l => l.practiced_at))
    setLoading(false)
  }

  const loadHistoryPage = async (offset: number) => {
    if (!user) return
    setLoadingMore(true)
    const { data } = await supabase
      .from('practice_logs').select('*')
      .eq('user_id', user.id)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    const logs = data ?? []
    setHistoryLogs(prev => offset === 0 ? logs : [...prev, ...logs])
    setHasMore(logs.length === PAGE_SIZE)
    setHistoryOffset(offset + logs.length)
    setLoadingMore(false)
  }

  const reloadHistory = () => {
    setHistoryLogs([])
    setHistoryOffset(0)
    setHasMore(true)
    loadHistoryPage(0)
  }

  const deleteLog = async () => {
    if (!deleteLogTarget) return
    await supabase.from('practice_logs').delete().eq('id', deleteLogTarget.id)
    setDeleteLogTarget(null)
    loadData()
    reloadHistory()
  }

  const practicedDays = new Set(
    monthLogs.map(l => parseInt(l.practiced_at.slice(8, 10)))
  )
  const getSelLogs = (day: number) =>
    monthLogs.filter(l => parseInt(l.practiced_at.slice(8, 10)) === day)

  const monthCount = monthLogs.length
  const monthMin   = monthLogs.reduce((s, l) => s + l.duration_min, 0)
  const streak     = calcStreak(streakDates)

  const days = ['月', '火', '水', '木', '金', '土', '日']
  const monthLabel = isCurrentMonth ? '今月' : `${viewMonth}月`

  return (
    <Screen>
      <Header sub={`${viewYear}年 ${viewMonth}月`} title="練習の記録" />

      {/* 統計3点 */}
      <div style={{ display: 'flex', gap: 8, margin: '10px 14px 0' }}>
        {[[`${monthCount}回`, monthLabel], [`${monthMin}分`, '合計'], [`${streak}日`, '連続']].map(([val, lb]) => (
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
            {/* 月ナビゲーション */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={prevMonth} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: t.bgInput, color: t.accent, fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>‹</button>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: font }}>
                {viewYear}年 {viewMonth}月
              </div>
              <button onClick={nextMonth} disabled={isCurrentMonth} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: isCurrentMonth ? 'transparent' : t.bgInput,
                color: isCurrentMonth ? t.dim : t.accent,
                fontSize: 16, cursor: isCurrentMonth ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>›</button>
            </div>

            {/* 曜日ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
              {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: t.muted, paddingBottom: 3 }}>{d}</div>)}
            </div>

            {/* 日付グリッド */}
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
                    {li === 0 && <div style={{ ...lbl, marginBottom: 8 }}>{viewMonth}月{sel}日（{selLogs.length}件）</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{
                          fontSize: 10, padding: '1px 8px', borderRadius: 8,
                          background: log.type === 'song' ? t.accentBg : '#eaf1fb',
                          border: `1px solid ${log.type === 'song' ? t.accentDim : '#6a95c8'}`,
                          color: log.type === 'song' ? t.accent : '#3a6ea8',
                        }}>
                          {log.type === 'song' ? '曲練習' : '基礎練'}
                        </span>
                        <span style={{ fontSize: 12, color: t.text }}>
                          {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                        </span>
                        {log.bpm && (
                          <span style={{ fontSize: 9, color: t.muted, background: t.bgSub, padding: '1px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontFamily: font }}>bpm: {log.bpm}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>{log.duration_min} min</span>
                        <button onClick={() => setMenuLogId(menuLogId === log.id ? null : log.id)}
                          style={{ background: 'transparent', border: 'none', color: t.dim, fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>···</button>
                      </div>
                    </div>
                    {menuLogId === log.id && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <button onClick={() => { setEditLog(log); setMenuLogId(null) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 11, cursor: 'pointer' }}>編集</button>
                        <button onClick={() => { setDeleteLogTarget(log); setMenuLogId(null) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: '1px solid #c0392b', background: 'transparent', color: '#c0392b', fontSize: 11, cursor: 'pointer' }}>削除</button>
                      </div>
                    )}
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
          {historyLogs.length === 0 && !loadingMore ? (
            <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0' }}>まだ練習記録がありません</div>
          ) : (
            <>
              <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom,${t.accentDim}60,${t.border})` }} />
              {historyLogs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: i === 0 ? t.accent : t.accentDim, border: `2px solid ${t.bg}`, marginTop: 7, flexShrink: 0, zIndex: 1 }} />
                  <div style={{
                    background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
                    flex: 1, padding: 12, borderLeft: `2px solid ${i === 0 ? t.accent : t.border}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{ fontSize: 10, color: t.muted }}>{log.practiced_at.slice(5).replace('-', '/')}</span>
                        <span style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 7,
                          background: log.type === 'song' ? t.accentBg : '#eaf1fb',
                          border: `1px solid ${log.type === 'song' ? t.accentDim : '#6a95c8'}`,
                          color: log.type === 'song' ? t.accent : '#3a6ea8',
                        }}>
                          {log.type === 'song' ? '曲練習' : '基礎練'}
                        </span>
                        <span style={{ fontSize: 12, color: t.text }}>
                          {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                        </span>
                        {log.bpm && (
                          <span style={{ fontSize: 9, color: t.muted, background: t.bgSub, padding: '1px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontFamily: font }}>bpm: {log.bpm}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>{log.duration_min} min</span>
                        <button onClick={() => setMenuLogId(menuLogId === log.id ? null : log.id)}
                          style={{ background: 'transparent', border: 'none', color: t.dim, fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>···</button>
                      </div>
                    </div>
                    {menuLogId === log.id && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <button onClick={() => { setEditLog(log); setMenuLogId(null) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 11, cursor: 'pointer' }}>編集</button>
                        <button onClick={() => { setDeleteLogTarget(log); setMenuLogId(null) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: '1px solid #c0392b', background: 'transparent', color: '#c0392b', fontSize: 11, cursor: 'pointer' }}>削除</button>
                      </div>
                    )}
                    {log.one_word && <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>}
                  </div>
                </div>
              ))}
              <div ref={sentinelRef} style={{ height: 1 }} />
              {loadingMore && (
                <div style={{ textAlign: 'center', color: t.dim, fontSize: 11, padding: '12px 0' }}>読み込み中…</div>
              )}
              {!hasMore && historyLogs.length > 0 && (
                <div style={{ textAlign: 'center', color: t.dim, fontSize: 11, padding: '12px 0', fontFamily: font }}>すべての記録を表示しました</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ログ編集モーダル */}
      {editLog && (
        <LogEditModal
          log={editLog}
          onSaved={() => { setEditLog(null); loadData(); reloadHistory() }}
          onClose={() => setEditLog(null)}
        />
      )}

      {/* ログ削除確認モーダル */}
      {deleteLogTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '0 32px' }}
          onClick={() => setDeleteLogTarget(null)}>
          <div style={{ background: t.bgCard, borderRadius: 14, padding: '24px 20px', width: '100%', maxWidth: 320 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8, fontFamily: font }}>練習記録を削除しますか？</div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 24, lineHeight: 1.6, fontFamily: font }}>
              {deleteLogTarget.practiced_at.slice(5).replace('-', '/')} の記録を削除します。<br />この操作は取り消せません。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteLogTarget(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={deleteLog} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: 'none', background: '#c0392b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
