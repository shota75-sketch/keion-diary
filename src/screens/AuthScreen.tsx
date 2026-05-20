import { useState } from 'react'
import { t, font, fontI } from '../theme'
import { useAuth } from '../context/AuthContext'

export function AuthScreen() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email.trim())
    setLoading(false)
    if (error) {
      setError(`エラー: ${error.message}`)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', fontFamily: font, maxWidth: 390, margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎸</div>
        <div style={{ fontFamily: fontI, fontSize: 28, color: t.accent, fontStyle: 'italic', marginBottom: 6 }}>
          軽音日記
        </div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6 }}>
          続けること、それだけでいい。
        </div>
      </div>

      {!sent ? (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
            メールアドレス
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="example@email.com"
            style={{
              width: '100%', background: t.bgCard,
              border: `1px solid ${email ? t.accent : t.border}`,
              borderRadius: 10, padding: '13px 16px', color: t.text,
              fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 12 }}>{error}</div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim()}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: email.trim() ? t.accent : t.dim,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: email.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {loading ? '送信中…' : 'ログインリンクを送る'}
          </button>
          <div style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
            メールアドレスにログイン用のリンクを送ります。<br />
            アカウントがない場合は自動で作成されます。
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%', background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 15, color: t.text, fontWeight: 600, marginBottom: 8 }}>
            メールを確認してください
          </div>
          <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.7 }}>
            <span style={{ color: t.accent }}>{email}</span> に<br />
            ログインリンクを送りました。<br />
            メール内のリンクをタップしてください。
          </div>
          <button
            onClick={() => setSent(false)}
            style={{
              marginTop: 20, background: 'transparent', border: 'none',
              color: t.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            別のメールアドレスで試す
          </button>
        </div>
      )}
    </div>
  )
}
