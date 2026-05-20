import { useState } from 'react'
import { t, font, fontI } from '../theme'
import { useAuth } from '../context/AuthContext'

type Step = 'email' | 'code'

export function AuthScreen() {
  const { signInWithEmail, verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inp = {
    width: '100%', background: t.bgCard, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '13px 16px', color: t.text,
    fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12,
  }

  const handleSendCode = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email.trim())
    setLoading(false)
    if (error) {
      setError(`エラー: ${error.message}`)
    } else {
      setStep('code')
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    const { error } = await verifyOtp(email.trim(), code.trim())
    setLoading(false)
    if (error) {
      setError('コードが正しくありません。再度確認してください。')
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

      {step === 'email' ? (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
            メールアドレス
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendCode()}
            placeholder="example@email.com"
            style={{ ...inp, border: `1px solid ${email ? t.accent : t.border}` }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 12 }}>{error}</div>
          )}
          <button
            onClick={handleSendCode}
            disabled={loading || !email.trim()}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: email.trim() ? t.accent : t.dim,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: email.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {loading ? '送信中…' : '確認コードを送る'}
          </button>
          <div style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
            メールアドレスに6桁のコードを送ります。<br />
            アカウントがない場合は自動で作成されます。
          </div>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{
            background: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: 12, padding: '16px 18px', marginBottom: 20,
            fontSize: 12, color: t.muted, lineHeight: 1.7, textAlign: 'center',
          }}>
            <span style={{ color: t.accent }}>{email}</span> に<br />
            6桁のコードを送りました
          </div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
            確認コード（6桁）
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="123456"
            style={{
              ...inp,
              fontFamily: fontI, fontSize: 28, textAlign: 'center',
              letterSpacing: '0.2em', color: t.accent, fontStyle: 'italic',
              border: `1px solid ${code.length === 6 ? t.accent : t.border}`,
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 12 }}>{error}</div>
          )}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: code.length === 6 ? t.accent : t.dim,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: code.length === 6 ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {loading ? '確認中…' : 'ログイン'}
          </button>
          <button
            onClick={() => { setStep('email'); setCode(''); setError('') }}
            style={{
              width: '100%', marginTop: 12, background: 'transparent', border: 'none',
              color: t.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            メールアドレスを変更する
          </button>
        </div>
      )}
    </div>
  )
}
