import { useState } from 'react'
import { t, font, fontI } from '../theme'
import { useAuth } from '../context/AuthContext'

const inp = {
  width: '100%', background: t.bgCard, borderRadius: 10,
  padding: '13px 16px', color: t.text, fontSize: 15,
  outline: 'none', boxSizing: 'border-box' as const, marginBottom: 10,
}

export function UpdatePasswordScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const isReady = password.length >= 6 && password === confirm

  const handleSubmit = async () => {
    if (!isReady) return
    setLoading(true)
    setError('')
    const { error } = await updatePassword(password)
    if (error) setError('パスワードの更新に失敗しました')
    else setDone(true)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', fontFamily: font, maxWidth: 390, margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🔑</div>
        <div style={{ fontFamily: fontI, fontSize: 24, color: t.accent, fontStyle: 'italic', marginBottom: 6 }}>
          新しいパスワード
        </div>
      </div>

      {done ? (
        <div style={{ width: '100%', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, color: t.text, fontWeight: 600, marginBottom: 8 }}>パスワードを更新しました</div>
          <div style={{ fontSize: 12, color: t.muted }}>そのままアプリを使い続けられます。</div>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="新しいパスワード（6文字以上）"
            style={{ ...inp, border: `1px solid ${password ? t.accent : t.border}` }}
          />
          <input
            type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="パスワードを再入力"
            style={{ ...inp, border: `1px solid ${confirm ? (password === confirm ? t.accent : '#c0392b') : t.border}` }}
          />
          {confirm && password !== confirm && (
            <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 10 }}>パスワードが一致しません</div>
          )}
          {error && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading || !isReady} style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: isReady ? t.accent : t.dim,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: isReady ? 'pointer' : 'default',
          }}>
            {loading ? '更新中…' : 'パスワードを更新する'}
          </button>
        </div>
      )}
    </div>
  )
}
