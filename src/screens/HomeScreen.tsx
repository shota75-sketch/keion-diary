import { useEffect, useState } from 'react'
import { Screen, Header, Card } from '../components'
import { t, font, fontI, IMAP } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbPracticeLog } from '../lib/types'
import { calcStreak } from '../lib/types'

type Song = { title: string; lastPracticed: string; sessions: number }
type Props = { name: string; instrument: InstrumentId; onSongTap: (song: Song) => void }

const lbl = { fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 5 } as const

function fmtRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return '今日'
  if (diff === 1) return '昨日'
  if (diff < 7) return `${diff}日前`
  if (diff < 14) return '1週間前'
  return `${Math.floor(diff / 7)}週間前`
}

export function HomeScreen({ name, instrument, onSongTap }: Props) {
  const inst = IMAP[instrument]
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState<DbPracticeLog[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [streak, setStreak] = useState(0)
  const [monthCount, setMonthCount] = useState(0)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // 最近のログ3件
    const { data: recent } = await supabase
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3)
    setRecentLogs(recent ?? [])

    // 今月の練習日数
    const { data: monthLogs } = await supabase
      .from('practice_logs')
      .select('practiced_at')
      .eq('user_id', user.id)
      .gte('practiced_at', monthStart)
    const uniqueDays = new Set((monthLogs ?? []).map(l => l.practiced_at))
    setMonthCount(uniqueDays.size)

    // 連続日数（直近90日分）
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const { data: allLogs } = await supabase
      .from('practice_logs')
      .select('practiced_at')
      .eq('user_id', user.id)
      .gte('practiced_at', ninetyDaysAgo)
    setStreak(calcStreak((allLogs ?? []).map(l => l.practiced_at)))

    // 練習曲一覧（最終練習日・セッション数）
    const { data: userSongs } = await supabase
      .from('user_songs')
      .select('title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (userSongs && userSongs.length > 0) {
      const songList = await Promise.all(
        userSongs.map(async (s: { title: string }) => {
          const { data: songLogs } = await supabase
            .from('practice_logs')
            .select('practiced_at')
            .eq('user_id', user.id)
            .eq('song_name', s.title)
            .order('practiced_at', { ascending: false })
          const sessions = songLogs?.length ?? 0
          const lastPracticed = songLogs?.[0]?.practiced_at
            ? fmtRelative(songLogs[0].practiced_at)
            : '未練習'
          return { title: s.title, lastPracticed, sessions }
        })
      )
      setSongs(songList)
    }
  }

  const displayLogs = recentLogs.length > 0 ? recentLogs : []

  return (
    <Screen>
      <Header sub={`${inst.icon} ${inst.label}`} title={`${name}の放課後ノート`} />

      {/* 連続日数カード */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${t.accent}` }}>
        <div style={{ textAlign: 'center', minWidth: 52 }}>
          <div style={{ fontFamily: fontI, fontSize: 40, lineHeight: 1, color: t.accent, fontStyle: 'italic' }}>{streak}</div>
          <div style={{ fontSize: 9, color: t.muted, marginTop: 2 }}>日連続</div>
        </div>
        <div style={{ flex: 1, borderLeft: `1px solid ${t.border}`, paddingLeft: 14 }}>
          <div style={{ fontSize: 12, color: t.text, marginBottom: 5 }}>今月 {monthCount}回 練習した</div>
          <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"続けること、それだけでいい。"</div>
        </div>
      </Card>

      {/* 練習中の曲 */}
      {songs.length > 0 && (
        <div style={{ margin: '10px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', marginBottom: 8 }}>
            <div style={lbl}>練習中の曲</div>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 14px 6px', scrollbarWidth: 'none' }}>
            {songs.map((song, i) => (
              <div key={i} onClick={() => onSongTap(song)} style={{
                background: i === 0 ? t.accentBg : t.bgCard,
                border: `1px solid ${i === 0 ? t.accentDim : t.border}`,
                borderRadius: 10, padding: 12, minWidth: 110, flexShrink: 0,
                opacity: song.lastPracticed.includes('週') ? 0.6 : 1,
                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{inst.icon}</div>
                <div style={{ fontSize: 12, color: t.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 96 }}>{song.title}</div>
                <div style={{ fontSize: 10, color: i === 0 ? t.accent : t.muted }}>{song.lastPracticed}</div>
                <div style={{ fontFamily: fontI, fontSize: 10, color: t.dim, marginTop: 2, fontStyle: 'italic' }}>{song.sessions}回</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近の練習 */}
      <div style={{ margin: '8px 14px 0' }}>
        <div style={{ ...lbl, marginBottom: 8 }}>最近の練習</div>
        {displayLogs.length === 0 ? (
          <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0', fontFamily: font }}>
            まだ練習記録がありません。<br />＋ボタンから記録してみましょう！
          </div>
        ) : (
          displayLogs.map((log, i) => (
            <div key={i} style={{
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
              margin: '6px 0', display: 'flex', gap: 10, padding: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ minWidth: 34, textAlign: 'right' }}>
                <div style={{ fontFamily: fontI, fontSize: 17, color: t.accent, fontStyle: 'italic', lineHeight: 1 }}>{log.duration_min}</div>
                <div style={{ fontSize: 8, color: t.muted, marginTop: 1 }}>min</div>
              </div>
              <div style={{ flex: 1, borderLeft: `1px solid ${t.border}`, paddingLeft: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>{fmtRelative(log.practiced_at)}</span>
                  <span style={{ fontSize: 11, color: t.text, fontWeight: 500, fontFamily: font }}>
                    {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                  </span>
                </div>
                {log.one_word && (
                  <div style={{ fontFamily: fontI, fontSize: 11, color: t.muted, fontStyle: 'italic' }}>"{log.one_word}"</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}
