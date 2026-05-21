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

// H=ユーモア, E=楽しさ, B=背中押し の順で偏らないよう配置
// パターン: H,H,E,H,B の繰り返し
const QUOTES = [
  "「もう1回だけ」が気づいたら1時間になってた。",         // H
  "耳コピ、なんか違う。でもまあいい。",                   // H
  "好きな曲を弾いてる。それだけでいい。",                 // E
  "速い曲、ゆっくりなら弾ける。問題はそこじゃない。",     // H
  "今日も弾いた。それだけで十分。",                       // B
  "「なんかおかしい」の原因、30分後に気づいた。",         // H
  "練習中はできた。なぜ本番でできないのか。",             // H
  "音を出すだけで楽しい。今日もそれでいい。",             // E
  "完璧に演奏できたのに、録音してなかった。",             // H
  "短くても、弾いた日は弾いた日。",                       // B
  "音楽って難しい。でも楽しい。たぶん。",                 // H
  "先輩のアドバイス、やっと意味がわかってきた。",         // H
  "うまくなくても音楽は楽しい。たぶん。",                 // E
  "休憩のつもりが30分経ってた。",                         // H
  "毎日じゃなくていい。また弾けばいい。",                 // B
  "うまくなってる気がする日と、そうじゃない日がある。",   // H
  "メトロノーム、いつか友達になれる気がする。",           // H
  "弾きたいから弾く。それ以上の理由はいらない。",         // E
  "録音して聴いたら思ったより下手だった。でも昨日よりうまい。", // H
  "昨日より少しだけ。それで十分。",                       // B
  "テンポ、ちょっとずれてた。まあいい。",                 // H
  "チューニングだけで10分かかった。それも練習。",         // H
  "完璧じゃなくていい。弾いた事実は残る。",               // B
  "練習してない曲、本番でなんとかなった（気がする）。",   // H
  "気づいたら1時間経ってた。いい練習だった。",            // B
]

const dayOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
)
const dailyQuote = QUOTES[dayOfYear % QUOTES.length]

const PRAISES = [
  'コツコツえらい',
  'その調子！',
  'いい感じ！',
  'いいペース！',
  'ちゃんとやってる',
  'えらすぎる',
  'よく続けてる',
  'いい積み上げ！',
  '着実に積んでる',
  '頑張ってる！',
]
const dailyPraise = PRAISES[dayOfYear % PRAISES.length]

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
  const [monthMin, setMonthMin] = useState(0)
  const [goalMin, setGoalMin] = useState(600)

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

    // 今月のユニーク練習日数と合計時間
    const { data: monthLogs } = await supabase
      .from('practice_logs')
      .select('practiced_at, duration_min')
      .eq('user_id', user.id)
      .gte('practiced_at', monthStart)
    setMonthCount(new Set((monthLogs ?? []).map(l => l.practiced_at)).size)
    setMonthMin((monthLogs ?? []).reduce((s, l) => s + l.duration_min, 0))

    // 連続日数（直近90日分）
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const { data: recentAllLogs } = await supabase
      .from('practice_logs').select('practiced_at').eq('user_id', user.id).gte('practiced_at', ninetyDaysAgo)
    setStreak(calcStreak((recentAllLogs ?? []).map(l => l.practiced_at)))

    // 目標練習時間
    const { data: userGoal } = await supabase
      .from('users')
      .select('goal_min_monthly')
      .eq('id', user.id)
      .single()
    setGoalMin(userGoal?.goal_min_monthly ?? 600)

    // 練習曲一覧（最終練習日・セッション数）
    const { data: userSongs } = await supabase
      .from('user_songs')
      .select('title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (userSongs && userSongs.length > 0) {
      const rawList = await Promise.all(
        userSongs.map(async (s: { title: string }) => {
          const { data: songLogs } = await supabase
            .from('practice_logs')
            .select('practiced_at')
            .eq('user_id', user.id)
            .eq('song_name', s.title)
            .order('practiced_at', { ascending: false })
          const sessions = songLogs?.length ?? 0
          const raw = songLogs?.[0]?.practiced_at ?? null
          const lastPracticed = raw ? fmtRelative(raw) : '未練習'
          return { title: s.title, lastPracticed, sessions, raw }
        })
      )
      rawList.sort((a, b) => {
        if (!a.raw && !b.raw) return 0
        if (!a.raw) return 1
        if (!b.raw) return -1
        return b.raw.localeCompare(a.raw)
      })
      setSongs(rawList.map(({ raw: _, ...rest }) => rest))
    }
  }

  const progressPct = goalMin > 0 ? Math.min(100, Math.round(monthMin / goalMin * 100)) : 0
  const displayLogs = recentLogs.length > 0 ? recentLogs : []

  return (
    <Screen>
      <Header title={`${inst.icon}${name}の軽音ノート`} />

      {/* 連続日数カード */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${t.accent}` }}>
        <div style={{ textAlign: 'center', minWidth: 52 }}>
          <div style={{ fontFamily: fontI, fontSize: 40, lineHeight: 1, color: t.accent, fontStyle: 'italic' }}>{streak}</div>
          <div style={{ fontSize: 9, color: t.muted, marginTop: 2, fontFamily: font }}>日連続</div>
        </div>
        <div style={{ flex: 1, borderLeft: `1px solid ${t.border}`, paddingLeft: 14 }}>
          <div style={{ fontSize: 12, color: t.text, marginBottom: 5 }}>
            {monthCount === 0 ? '今月はまだ練習していないよ。最初の一歩を！' : `今月 ${monthCount}日練習！${dailyPraise}`}
          </div>
          <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{dailyQuote}"</div>
        </div>
      </Card>

      {/* 月間目標進捗バー */}
      <Card style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em' }}>今月の目標</div>
          <div style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic' }}>
            {monthMin} / {goalMin} 分
          </div>
        </div>
        <div style={{ background: t.bgInput, borderRadius: 4, height: 7, overflow: 'hidden', border: `1px solid ${t.border}` }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: progressPct >= 100 ? t.green : t.accent,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }} />
        </div>
        {progressPct >= 100 ? (
          <div style={{ fontSize: 10, color: t.green, marginTop: 5, textAlign: 'right', fontFamily: font }}>🎉 今月の目標達成！</div>
        ) : (
          <div style={{ fontSize: 10, color: t.dim, marginTop: 5, textAlign: 'right', fontFamily: font }}>{progressPct}%</div>
        )}
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
              borderLeft: `2px solid ${i === 0 ? t.accent : t.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ minWidth: 34, textAlign: 'center', paddingTop: 2 }}>
                <div style={{ fontSize: 10, color: i === 0 ? t.accent : t.muted, fontFamily: font, fontWeight: i === 0 ? 600 : 400, lineHeight: 1.3 }}>
                  {fmtRelative(log.practiced_at)}
                </div>
              </div>
              <div style={{ flex: 1, borderLeft: `1px solid ${t.border}`, paddingLeft: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 7,
                      background: log.type === 'song' ? t.accentBg : '#eaf1fb',
                      border: `1px solid ${log.type === 'song' ? t.accentDim : '#6a95c8'}`,
                      color: log.type === 'song' ? t.accent : '#3a6ea8',
                    }}>
                      {log.type === 'song' ? '曲練習' : '基礎練'}
                    </span>
                    <span style={{ fontSize: 11, color: t.text, fontWeight: 500, fontFamily: font }}>
                      {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                    </span>
                    {log.bpm && (
                      <span style={{ fontSize: 9, color: t.muted, background: t.bgSub, padding: '1px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontFamily: font }}>bpm: {log.bpm}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: fontI, fontSize: 11, color: t.accent, fontStyle: 'italic', flexShrink: 0, marginLeft: 6 }}>{log.duration_min} min</span>
                </div>
                {log.memo && (
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 3, lineHeight: 1.4 }}>{log.memo}</div>
                )}
                {log.one_word && (
                  <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}
