import { useState } from 'react'
import { t, font, fontI } from '../theme'
import { useAuth } from '../context/AuthContext'

const inp = {
  width: '100%', background: t.bgCard, borderRadius: 10,
  padding: '13px 16px', color: t.text, fontSize: 15,
  outline: 'none', boxSizing: 'border-box' as const, marginBottom: 10,
}

export function AuthScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle, signInWithApple } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    if (mode === 'login') {
      const { error } = await signInWithPassword(email.trim(), password)
      if (error) setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      const { error } = await signUpWithPassword(email.trim(), password)
      if (error) {
        setError(`エラー: ${error.message}`)
      } else {
        setDone(true)
      }
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(`Googleログインに失敗しました: ${error.message}`)
  }

  const handleApple = async () => {
    setError('')
    const { error } = await signInWithApple()
    if (error) setError(`Appleログインに失敗しました: ${error.message}`)
  }

  const isReady = email.trim().length > 0 && password.length >= 6

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', fontFamily: font, maxWidth: 390, margin: '0 auto',
    }}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎸</div>
        <div style={{ fontFamily: fontI, fontSize: 28, color: t.accent, fontStyle: 'italic', marginBottom: 6 }}>
          軽音日記
        </div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6 }}>
          続けること、それだけでいい。
        </div>
      </div>

      {done ? (
        <div style={{ width: '100%', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 15, color: t.text, fontWeight: 600, marginBottom: 8 }}>確認メールを送りました</div>
          <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.7 }}>
            <span style={{ color: t.accent }}>{email}</span> に届いたメールのリンクをタップしてアカウントを有効化してください。
          </div>
          <button onClick={() => { setDone(false); setMode('login') }}
            style={{ marginTop: 20, background: 'transparent', border: 'none', color: t.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
            ログイン画面に戻る
          </button>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          {/* ソーシャルログイン */}
          <button onClick={handleApple} style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: '#000', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}></span> Appleでログイン
          </button>
          <button onClick={handleGoogle} style={{
            width: '100%', padding: '13px 0', borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.bgCard,
            color: t.text, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>G</span> Googleでログイン
          </button>

          {/* 区切り */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            <div style={{ fontSize: 11, color: t.dim }}>または</div>
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          {/* ログイン / 新規登録タブ */}
          <div style={{ display: 'flex', background: t.bgInput, borderRadius: 9, padding: 3, marginBottom: 16 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                background: mode === m ? t.bgCard : 'transparent',
                color: mode === m ? t.text : t.muted,
                fontSize: 13, fontWeight: mode === m ? 600 : 400, cursor: 'pointer',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          {/* フォーム */}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="メールアドレス"
            style={{ ...inp, border: `1px solid ${email ? t.accent : t.border}` }}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            placeholder={mode === 'signup' ? 'パスワード（6文字以上）' : 'パスワード'}
            style={{ ...inp, border: `1px solid ${password ? t.accent : t.border}` }}
          />

          {error && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 10 }}>{error}</div>}

          <button onClick={handleEmailAuth} disabled={loading || !isReady} style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: isReady ? t.accent : t.dim,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: isReady ? 'pointer' : 'default', transition: 'all 0.2s',
          }}>
            {loading ? '処理中…' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </div>
      )}
    </div>
  )
}
