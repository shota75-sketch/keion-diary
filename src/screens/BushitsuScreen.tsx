import { useState } from "react";
import { Screen, Header, Card } from "../components";
import { t, font, fontI, IMAP, INSTRUMENTS } from "../theme";

type Reactions = Record<string, Record<string, number>>;

export function BushitsuScreen() {
  const [reactions, setReactions] = useState<Reactions>({
    takuya: { "🎸": 2, "🔥": 1, "👏": 0 },
    miku:   { "🎸": 0, "🔥": 0, "👏": 1 },
    sho:    { "🎸": 1, "🔥": 0, "👏": 0 },
  });
  const [myR, setMyR] = useState<Record<string, boolean>>({});
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const friends = [
    { id: "takuya", name: "たくや", inst: "guitar" as const, streak: 18, today: true,  last: { when: "今日", min: 45, song: "天体観測",     word: "やっと通して弾けた" } },
    { id: "miku",   name: "みく",   inst: "vocal"  as const, streak: 7,  today: false, last: { when: "3日前", min: 30, song: "小さな恋のうた", word: "今日は忙しかった…" } },
    { id: "sho",    name: "しょう", inst: "drums"  as const, streak: 41, today: true,  last: { when: "今日", min: 20, song: "青と夏",         word: "短くても叩いた" } },
  ];

  const [pendingIn, setPendingIn] = useState([
    { id: "p1", name: "さくら", inst: "keyboard" as const, code: "SAKURA-42" },
    { id: "p2", name: "けんた", inst: "bass"     as const, code: "KENTA-77" },
  ]);
  const [pendingOut, setPendingOut] = useState([{ id: "o1", name: "まい", code: "MAI-55" }]);

  const react = (fid: string, emoji: string) => {
    const key = `${fid}-${emoji}`;
    const already = myR[key];
    setMyR(p => ({ ...p, [key]: !already }));
    setReactions(p => ({ ...p, [fid]: { ...p[fid], [emoji]: p[fid][emoji] + (already ? -1 : 1) } }));
  };

  return (
    <Screen>
      <Header sub={`招待制 · ${friends.length + 1}人`} title="部室" />

      {/* 自分のカード */}
      <Card style={{ borderLeft: `2px solid ${t.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accentBg, border: `2px solid ${t.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎸</div>
          <div>
            <div style={{ fontSize: 13, color: t.text, fontWeight: 500, fontFamily: font }}>ゆうき <span style={{ fontSize: 9, color: t.muted, fontWeight: 400 }}>（自分）</span></div>
            <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>ギター · 🔥 32日</div>
          </div>
        </div>
        <div style={{ background: t.bgSub, borderRadius: 8, padding: "9px 11px", border: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>今日</span>
            <span style={{ fontFamily: fontI, fontSize: 10, color: t.accent, fontStyle: "italic" }}>20min</span>
          </div>
          <div style={{ fontFamily: fontI, fontSize: 11, color: t.muted, fontStyle: "italic" }}>"指が少し慣れてきた気がする"</div>
        </div>
      </Card>

      {/* 承認待ち */}
      {pendingIn.length > 0 && (
        <div style={{ margin: "4px 14px 0" }}>
          <div style={{ fontSize: 10, color: t.accent, letterSpacing: "0.08em", marginBottom: 8 }}>承認待ち {pendingIn.length}件</div>
          {pendingIn.map(req => {
            const fi = IMAP[req.inst] || INSTRUMENTS[0];
            return (
              <div key={req.id} style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, margin: "6px 0", borderLeft: `2px solid ${t.accentDim}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: t.bgCard, border: `1px solid ${t.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{fi.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: t.text, fontWeight: 500, fontFamily: font }}>{req.name}</div>
                    <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{fi.label} · コード: {req.code}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPendingIn(p => p.filter(r => r.id !== req.id))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: t.green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ 承認する</button>
                  <button onClick={() => setPendingIn(p => p.filter(r => r.id !== req.id))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: 12, cursor: "pointer" }}>断る</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 部員リスト */}
      <div style={{ margin: "4px 14px 0" }}>
        <div style={{ fontSize: 10, color: t.muted, letterSpacing: "0.08em", marginBottom: 8, fontFamily: font }}>部員</div>
        {friends.map(f => {
          const fi = IMAP[f.inst];
          return (
            <div key={f.id} style={{
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
              padding: 14, margin: "7px 0", borderLeft: `2px solid ${f.today ? t.green : t.border}`,
              opacity: f.today ? 1 : 0.8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: f.today ? t.greenBg : t.bgInput, border: `1px solid ${f.today ? t.green : t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{fi.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: t.text, fontWeight: 500, fontFamily: font }}>{f.name}</div>
                  <div style={{ fontSize: 9, color: t.muted, fontFamily: font }}>{fi.label} · 🔥 {f.streak}日</div>
                </div>
              </div>
              <div style={{ background: t.bgInput, borderRadius: 7, padding: "9px 11px", marginBottom: 9, border: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: font }}>{f.last.when}</span>
                    {f.last.song && <span style={{ fontSize: 10, color: t.accent, background: t.accentBg, padding: "1px 6px", borderRadius: 6, border: `1px solid ${t.accentDim}`, fontFamily: font }}>{f.last.song}</span>}
                  </div>
                  <span style={{ fontFamily: fontI, fontSize: 10, color: t.accent, fontStyle: "italic" }}>{f.last.min}min</span>
                </div>
                <div style={{ fontFamily: fontI, fontSize: 11, color: t.muted, fontStyle: "italic" }}>"{f.last.word}"</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {["🎸", "🔥", "👏"].map(emoji => {
                  const key = `${f.id}-${emoji}`;
                  const active = myR[key];
                  const count = reactions[f.id]?.[emoji] ?? 0;
                  return (
                    <button key={emoji} onClick={() => react(f.id, emoji)} style={{
                      display: "flex", alignItems: "center", gap: 3,
                      padding: "3px 9px", borderRadius: 14,
                      border: `1px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentBg : "transparent",
                      color: active ? t.accent : t.muted,
                      fontSize: 12, cursor: "pointer",
                    }}>
                      {emoji}{count > 0 && <span style={{ fontSize: 10, fontFamily: font }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 申請中 */}
        {pendingOut.map(req => (
          <div key={req.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, margin: "7px 0", borderLeft: `2px solid ${t.dim}`, opacity: 0.7, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: t.muted, fontWeight: 500, fontFamily: font }}>{req.name}</div>
                <div style={{ fontSize: 9, color: t.dim, marginTop: 2, fontFamily: font }}>承認待ち…</div>
              </div>
              <button onClick={() => setPendingOut(p => p.filter(r => r.id !== req.id))} style={{ fontSize: 10, color: t.muted, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}>取り消す</button>
            </div>
          </div>
        ))}
      </div>

      {/* 部員を追加 */}
      <div style={{ padding: "6px 14px 24px" }}>
        {!showInvite ? (
          <button onClick={() => setShowInvite(true)} style={{ width: "100%", padding: 12, borderRadius: 9, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: 13, cursor: "pointer" }}>
            + 部員を追加する
          </button>
        ) : (
          <Card style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 500, fontFamily: font }}>部員を追加する</div>
              <button onClick={() => setShowInvite(false)} style={{ background: "transparent", border: "none", color: t.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t.muted, letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>フレンドコードで追加</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input placeholder="例：KENTA-77" style={{ flex: 1, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 13, outline: "none", letterSpacing: "0.05em" }} />
                <button style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>追加</button>
              </div>
              <div style={{ fontSize: 10, color: t.muted, marginTop: 5, fontFamily: font }}>相手のマイページからコードを確認してもらってください</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <div style={{ fontSize: 10, color: t.dim, fontFamily: font }}>または</div>
              <div style={{ flex: 1, height: 1, background: t.border }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.muted, letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>招待リンクを送る</div>
              <div style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 7, padding: "9px 11px", fontSize: 11, color: t.muted, marginBottom: 8, wordBreak: "break-all", fontFamily: font }}>
                https://koebu.app/invite/ゆうき-abc123
              </div>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: copied ? t.green : t.accentDim, color: "#fff", fontSize: 13, cursor: "pointer", transition: "all 0.3s" }}>
                {copied ? "✓ コピーした" : "リンクをコピー"}
              </button>
            </div>
          </Card>
        )}
      </div>
    </Screen>
  );
}
