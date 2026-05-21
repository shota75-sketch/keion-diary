import { useEffect, useState } from 'react'
import { Screen, LogEditModal } from '../components'
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
  const [menuLogId, setMenuLogId] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<DbPracticeLog | null>(null)
  const [deleteLogTarget, setDeleteLogTarget] = useState<DbPracticeLog | null>(null)
  const [showSongDelete, setShowSongDelete] = useState(false)

  useEffect(() => {
    if (!user) return
    loadLogs()
  }, [user, song.title])

  const loadLogs = () => {
    if (!user) return
    supabase
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('song_name', song.title)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }

  const deleteLog = async () => {
    if (!deleteLogTarget) return
    await supabase.from('practice_logs').delete().eq('id', deleteLogTarget.id)
    setDeleteLogTarget(null)
    loadLogs()
  }

  const deleteSong = async () => {
    if (!user) return
    await supabase.from('user_songs').delete().eq('user_id', user.id).eq('title', song.title)
    onBack()
  }

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
        <button onClick={() => setShowSongDelete(true)}
          style={{ background: 'transparent', border: 'none', color: t.dim, fontSize: 18, cursor: 'pointer', padding: '2px 4px', paddingBottom: 2 }}>···</button>
      </div>

      {/* 統計3点 */}
      <div style={{ display: 'flex', gap: 8, margin: '10px 14px 0' }}>
        {[
          [logs.length + '回', '練習回数'],
          [totalMin + '分', '合計時間'],
          [song.lastPracticed, '最終練習日'],
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>
                      {log.practiced_at.slice(5).replace('-', '/')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {log.memo && <div style={{ fontSize: 11, color: t.muted, marginBottom: 4, lineHeight: 1.5 }}>{log.memo}</div>}
                  {log.one_word && <div style={{ fontFamily: fontI, fontSize: 11, color: t.accentDim, fontStyle: 'italic' }}>"{log.one_word}"</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ログ編集モーダル */}
      {editLog && (
        <LogEditModal
          log={editLog}
          onSaved={() => { setEditLog(null); loadLogs() }}
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

      {/* 曲削除確認モーダル */}
      {showSongDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '0 32px' }}
          onClick={() => setShowSongDelete(false)}>
          <div style={{ background: t.bgCard, borderRadius: 14, padding: '24px 20px', width: '100%', maxWidth: 320 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8, fontFamily: font }}>この曲を削除しますか？</div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 24, lineHeight: 1.6, fontFamily: font }}>
              <span style={{ color: t.text, fontWeight: 500 }}>「{song.title}」</span> を練習中の曲から外します。<br />
              練習記録は残ります。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSongDelete(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={deleteSong} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: 'none', background: '#c0392b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
