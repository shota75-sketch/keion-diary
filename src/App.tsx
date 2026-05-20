import { useState } from "react";
import { t, font } from "./theme";
import type { InstrumentId } from "./theme";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  AuthScreen, HomeScreen, RecordScreen, HistoryScreen,
  BushitsuScreen, MyPageScreen, SongDetailScreen,
} from "./screens";

type TabId = "home" | "history" | "record" | "bushitsu" | "mypage";
type Song = { title: string; lastPracticed: string; sessions: number };

const TABS: { id: TabId; label: string; icon: string; center?: boolean }[] = [
  { id: "home",     label: "ホーム", icon: "🏠" },
  { id: "history",  label: "履歴",   icon: "📅" },
  { id: "record",   label: "",        icon: "＋", center: true },
  { id: "bushitsu", label: "部室",   icon: "🚪" },
  { id: "mypage",   label: "My",     icon: "👤" },
];

function AppContent() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("home");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [name, setName] = useState("ゆうき");
  const [instrument, setInstrument] = useState<InstrumentId>("guitar");

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: t.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: font, color: t.muted, fontSize: 13,
      }}>
        読み込み中…
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div style={{
      fontFamily: font, background: t.bg, color: t.text,
      minHeight: "100vh", maxWidth: 390, margin: "0 auto", position: "relative",
    }}>
      {selectedSong ? (
        <SongDetailScreen
          song={selectedSong}
          instrument={instrument}
          onBack={() => setSelectedSong(null)}
        />
      ) : (
        <>
          {tab === "home"     && <HomeScreen name={name} instrument={instrument} onSongTap={setSelectedSong} />}
          {tab === "record"   && <RecordScreen instrument={instrument} />}
          {tab === "history"  && <HistoryScreen />}
          {tab === "bushitsu" && <BushitsuScreen />}
          {tab === "mypage"   && (
            <MyPageScreen
              onProfileLoad={(inst, n) => { setInstrument(inst); setName(n); }}
            />
          )}
        </>
      )}

      {!selectedSong && (
        <nav style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 390, background: t.bgCard,
          borderTop: `1px solid ${t.border}`, display: "flex",
          alignItems: "center", height: 60, zIndex: 100,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
        }}>
          {TABS.map(tb => tb.center ? (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", background: "none",
              border: "none", cursor: "pointer", padding: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: tab === "record" ? t.accent : t.accentDim,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: "#fff",
                boxShadow: `0 2px 8px ${t.accentDim}80`, transition: "all 0.2s",
              }}>＋</div>
            </button>
          ) : (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3, background: "none", border: "none", cursor: "pointer",
              color: tab === tb.id ? t.accent : t.dim,
              fontSize: 8, letterSpacing: "0.06em", padding: 0, transition: "color 0.2s",
            }}>
              <span style={{ fontSize: 18 }}>{tb.icon}</span>
              <span>{tb.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
