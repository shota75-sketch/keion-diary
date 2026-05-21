import { useEffect, useState } from 'react'
import { Screen, Header, Card } from '../components'
import { t, font, fontI, IMAP } from '../theme'
import type { InstrumentId } from '../theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DbUser, DbPracticeLog, DbFriendRequest } from '../lib/types'
import { calcStreak } from '../lib/types'

type FriendInfo = {
  requestId: string
  user: DbUser
  recentLogs: DbPracticeLog[]
  latestLog: DbPracticeLog | null
  streak: number
  practicedToday: boolean
}

type PendingRequest = {
  requestId: string
  user: DbUser
}

function fmtRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return '今日'
  if (diff === 1) return '昨日'
  if (diff < 7) return `${diff}日前`
  if (diff < 14) return '1週間前'
  return `${Math.floor(diff / 7)}週間前`
}

export function BushitsuScreen() {
  const { user } = useAuth()
  const [myUser, setMyUser] = useState<DbUser | null>(null)
  const [todayLog, setTodayLog] = useState<DbPracticeLog | null>(null)
  const [friends, setFriends] = useState<FriendInfo[]>([])
  const [pendingIn, setPendingIn] = useState<PendingRequest[]>([])
  const [pendingOut, setPendingOut] = useState<PendingRequest[]>([])
  const [reactionCounts, setReactionCounts] = useState<Map<string, Record<string, number>>>(new Map())
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: myUserData }, { data: todayLogs }, { data: requests }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('practice_logs').select('*')
        .eq('user_id', user.id).eq('practiced_at', today)
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('friend_requests').select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`),
    ])

    setMyUser(myUserData ?? null)
    setTodayLog(todayLogs?.[0] ?? null)

    if (!requests || requests.length === 0) {
      setFriends([])
      setPendingIn([])
      setPendingOut([])
      setLoading(false)
      return
    }

    const reqs = requests as DbFriendRequest[]
    const approved  = reqs.filter(r => r.status === 'approved')
    const pendingI  = reqs.filter(r => r.status === 'pending' && r.to_user_id === user.id)
    const pendingO  = reqs.filter(r => r.status === 'pending' && r.from_user_id === user.id)

    const otherIds = [...new Set(reqs.map(r => r.from_user_id === user.id ? r.to_user_id : r.from_user_id))]
    const friendIds = approved.map(r => r.from_user_id === user.id ? r.to_user_id : r.from_user_id)

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

    const [{ data: otherUsers }, { data: friendLogs }] = await Promise.all([
      supabase.from('users').select('*').in('id', otherIds),
      friendIds.length > 0
        ? supabase.from('practice_logs').select('*')
            .in('user_id', friendIds)
            .gte('practiced_at', ninetyDaysAgo)
            .order('practiced_at', { ascending: false })
        : Promise.resolve({ data: [] as DbPracticeLog[] }),
    ])

    const userMap = new Map<string, DbUser>((otherUsers ?? []).map(u => [u.id, u]))

    // 最新ログのIDを収集してリアクション取得
    const latestLogMap = new Map<string, DbPracticeLog>()
    for (const log of (friendLogs ?? []) as DbPracticeLog[]) {
      if (!latestLogMap.has(log.user_id)) latestLogMap.set(log.user_id, log)
    }
    const latestLogIds = [...latestLogMap.values()].map(l => l.id)

    const newReactionCounts = new Map<string, Record<string, number>>()
    const newMyReactions = new Set<string>()

    if (latestLogIds.length > 0) {
      const { data: rxns } = await supabase.from('reactions').select('*').in('log_id', latestLogIds)
      for (const rxn of rxns ?? []) {
        if (!newReactionCounts.has(rxn.log_id)) newReactionCounts.set(rxn.log_id, {})
        const c = newReactionCounts.get(rxn.log_id)!
        c[rxn.emoji] = (c[rxn.emoji] ?? 0) + 1
        if (rxn.from_user_id === user.id) newMyReactions.add(`${rxn.log_id}-${rxn.emoji}`)
      }
    }

    const friendInfoList: FriendInfo[] = approved.map(r => {
      const fid = r.from_user_id === user.id ? r.to_user_id : r.from_user_id
      const fu = userMap.get(fid)
      if (!fu) return null
      const logs = ((friendLogs ?? []) as DbPracticeLog[]).filter(l => l.user_id === fid)
      return {
        requestId: r.id,
        user: fu,
        recentLogs: logs.slice(0, 3),
        latestLog: logs[0] ?? null,
        streak: calcStreak(logs.map(l => l.practiced_at)),
        practicedToday: logs.some(l => l.practiced_at === today),
      }
    }).filter(Boolean) as FriendInfo[]

    const pendingInList: PendingRequest[] = pendingI
      .map(r => ({ requestId: r.id, user: userMap.get(r.from_user_id)! }))
      .filter(r => r.user)

    const pendingOutList: PendingRequest[] = pendingO
      .map(r => ({ requestId: r.id, user: userMap.get(r.to_user_id)! }))
      .filter(r => r.user)

    setFriends(friendInfoList)
    setPendingIn(pendingInList)
    setPendingOut(pendingOutList)
    setReactionCounts(newReactionCounts)
    setMyReactions(newMyReactions)
    setLoading(false)
  }

  const sendFriendRequest = async () => {
    if (!inputCode.trim() || !user) return
    setSending(true)
    setSendError('')

    const { data: target } = await supabase
      .from('users').select('id, username')
      .eq('friend_code', inputCode.trim().toUpperCase())
      .single()

    if (!target) {
      setSendError('コードが見つかりませんでした')
      setSending(false)
      return
    }
    if (target.id === user.id) {
      setSendError('自分のコードは使えません')
      setSending(false)
      return
    }

    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: target.id,
      status: 'pending',
    })

    if (error) {
      setSendError('申請に失敗しました。既に申請済みかもしれません。')
    } else {
      setInputCode('')
      setShowInvite(false)
      loadData()
    }
    setSending(false)
  }

  const approveRequest = async (id: string) => {
    await supabase.from('friend_requests').update({ status: 'approved' }).eq('id', id)
    loadData()
  }

  const rejectRequest = async (id: string) => {
    await supabase.from('friend_requests').delete().eq('id', id)
    loadData()
  }

  const cancelRequest = async (id: string) => {
    await supabase.from('friend_requests').delete().eq('id', id)
    loadData()
  }

  const toggleReaction = async (logId: string, emoji: string) => {
    if (!user) return
    const key = `${logId}-${emoji}`
    const already = myReactions.has(key)

    // 楽観的更新（即座にUIに反映）
    if (already) {
      setMyReactions(prev => { const n = new Set(prev); n.delete(key); return n })
      setReactionCounts(prev => {
        const n = new Map(prev)
        const c = { ...n.get(logId) }
        c[emoji] = Math.max(0, (c[emoji] ?? 1) - 1)
        n.set(logId, c)
        return n
      })
      await supabase.from('reactions').delete()
        .eq('from_user_id', user.id).eq('log_id', logId).eq('emoji', emoji)
    } else {
      setMyReactions(prev => new Set([...prev, key]))
      setReactionCounts(prev => {
        const n = new Map(prev)
        const c = { ...n.get(logId) }
        c[emoji] = (c[emoji] ?? 0) + 1
        n.set(logId, c)
        return n
      })
      await supabase.from('reactions').insert({ from_user_id: user.id, log_id: logId, emoji })
    }
  }

  const inst = (id: string) => IMAP[id as InstrumentId] ?? IMAP.guitar

  return (
    <Screen>
      <Header sub={`招待制 · ${1 + friends.length}人`} title="部室" />

      {/* 自分のカード */}
      {myUser && (
        <Card style={{ borderLeft: `2px solid ${t.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: todayLog ? 8 : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.accentBg, border: `2px solid ${t.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {inst(myUser.instrument).icon}
            </div>
            <div>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 500, fontFamily: font }}>
                {myUser.username} <span style={{ fontSize: 9, color: t.muted, fontWeight: 400 }}>（自分）</span>
              </div>
              <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{inst(myUser.instrument).label}</div>
            </div>
          </div>
          {todayLog && (
            <div style={{ background: t.bgSub, borderRadius: 8, padding: '9px 11px', border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>今日</span>
                <span style={{ fontFamily: fontI, fontSize: 10, color: t.accent, fontStyle: 'italic' }}>{todayLog.duration_min}min</span>
              </div>
              {todayLog.one_word && (
                <div style={{ fontFamily: fontI, fontSize: 11, color: t.muted, fontStyle: 'italic' }}>"{todayLog.one_word}"</div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 承認待ち（受信） */}
      {pendingIn.length > 0 && (
        <div style={{ margin: '4px 14px 0' }}>
          <div style={{ fontSize: 10, color: t.accent, letterSpacing: '0.08em', marginBottom: 8 }}>承認待ち {pendingIn.length}件</div>
          {pendingIn.map(req => {
            const fi = inst(req.user.instrument)
            return (
              <div key={req.requestId} style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, margin: '6px 0', borderLeft: `2px solid ${t.accentDim}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.bgCard, border: `1px solid ${t.accentDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{fi.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: t.text, fontWeight: 500, fontFamily: font }}>{req.user.username}</div>
                    <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{fi.label} · {req.user.friend_code}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => approveRequest(req.requestId)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: t.green, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 承認する</button>
                  <button onClick={() => rejectRequest(req.requestId)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 12, cursor: 'pointer' }}>断る</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 部員リスト */}
      <div style={{ margin: '4px 14px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', fontFamily: font }}>部員</div>
          <button onClick={() => loadData()} disabled={loading} style={{ fontSize: 10, color: t.muted, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: font }}>
            🔄 更新
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0' }}>読み込み中…</div>
        ) : friends.length === 0 && pendingOut.length === 0 ? (
          <div style={{ textAlign: 'center', color: t.dim, fontSize: 12, padding: '24px 0', lineHeight: 1.8 }}>
            まだ部員がいません。<br />「部員を追加する」からフレンドを招待しよう！
          </div>
        ) : (
          <>
            {friends.map(f => {
              const fi = inst(f.user.instrument)
              const logId = f.latestLog?.id
              const counts = logId ? (reactionCounts.get(logId) ?? {}) : {}
              return (
                <div key={f.requestId} style={{
                  background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
                  padding: 14, margin: '7px 0',
                  borderLeft: `2px solid ${f.practicedToday ? t.green : t.border}`,
                  opacity: f.practicedToday ? 1 : 0.8,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: f.practicedToday ? t.greenBg : t.bgInput, border: `1px solid ${f.practicedToday ? t.green : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{fi.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: t.text, fontWeight: 500, fontFamily: font }}>{f.user.username}</div>
                      <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{fi.label} · 🔥 {f.streak}日</div>
                    </div>
                  </div>
                  {f.recentLogs.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 9, paddingBottom: 2 }}>
                      {f.recentLogs.map((log, li) => (
                        <div key={log.id} style={{
                          flexShrink: 0, minWidth: 100,
                          background: li === 0 ? t.accentBg : t.bgInput,
                          border: `1px solid ${li === 0 ? t.accentDim : t.border}`,
                          borderRadius: 8, padding: '7px 10px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{fmtRelative(log.practiced_at)}</span>
                            <span style={{ fontFamily: fontI, fontSize: 10, color: t.accent, fontStyle: 'italic' }}>{log.duration_min}min</span>
                          </div>
                          <div style={{ fontSize: 10, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 88 }}>
                            {log.type === 'song' ? log.song_name : log.detail || '基礎練'}
                          </div>
                          {li === 0 && log.one_word && (
                            <div style={{ fontFamily: fontI, fontSize: 10, color: t.muted, fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 88 }}>"{log.one_word}"</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: t.dim, marginBottom: 9, padding: '4px 0' }}>まだ練習記録がありません</div>
                  )}
                  {logId && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      {['🎸', '🔥', '👏'].map(emoji => {
                        const key = `${logId}-${emoji}`
                        const active = myReactions.has(key)
                        const count = counts[emoji] ?? 0
                        return (
                          <button key={emoji} onClick={() => toggleReaction(logId, emoji)} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '3px 9px', borderRadius: 14,
                            border: `1px solid ${active ? t.accent : t.border}`,
                            background: active ? t.accentBg : 'transparent',
                            color: active ? t.accent : t.muted,
                            fontSize: 12, cursor: 'pointer',
                          }}>
                            {emoji}{count > 0 && <span style={{ fontSize: 10, fontFamily: font }}>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 申請中（送信） */}
            {pendingOut.map(req => (
              <div key={req.requestId} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, margin: '7px 0', borderLeft: `2px solid ${t.dim}`, opacity: 0.7, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: t.muted, fontWeight: 500, fontFamily: font }}>{req.user.username}</div>
                    <div style={{ fontSize: 9, color: t.dim, marginTop: 2, fontFamily: font }}>承認待ち…</div>
                  </div>
                  <button onClick={() => cancelRequest(req.requestId)} style={{ fontSize: 10, color: t.muted, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 7, padding: '4px 8px', cursor: 'pointer' }}>取り消す</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 部員を追加 */}
      <div style={{ padding: '6px 14px 24px' }}>
        {!showInvite ? (
          <button onClick={() => setShowInvite(true)} style={{ width: '100%', padding: 12, borderRadius: 9, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 13, cursor: 'pointer' }}>
            + 部員を追加する
          </button>
        ) : (
          <Card style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 500, fontFamily: font }}>部員を追加する</div>
              <button onClick={() => { setShowInvite(false); setSendError(''); setInputCode('') }} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 6, fontFamily: font }}>フレンドコードで追加</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendFriendRequest()}
                placeholder="例：SHOTA-1234"
                style={{ flex: 1, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 12px', color: t.text, fontSize: 13, outline: 'none', letterSpacing: '0.05em' }}
              />
              <button onClick={sendFriendRequest} disabled={sending || !inputCode.trim()} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: inputCode.trim() ? t.accent : t.dim, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                {sending ? '…' : '追加'}
              </button>
            </div>
            {sendError && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 6 }}>{sendError}</div>}
            <div style={{ fontSize: 10, color: t.muted, fontFamily: font }}>相手のマイページからコードを確認してもらってください</div>

            {myUser?.friend_code && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
                  <div style={{ flex: 1, height: 1, background: t.border }} />
                  <div style={{ fontSize: 10, color: t.dim, fontFamily: font }}>自分のコード</div>
                  <div style={{ flex: 1, height: 1, background: t.border }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: fontI, fontSize: 20, color: t.accent, fontStyle: 'italic', letterSpacing: '0.06em', flex: 1 }}>{myUser.friend_code}</div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(myUser.friend_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: copied ? t.green : t.bgInput, color: copied ? '#fff' : t.muted, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {copied ? '✓ コピー' : 'コピー'}
                  </button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </Screen>
  )
}
