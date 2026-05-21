export const t = {
  bg:        "#f7f4ef",
  bgCard:    "#ffffff",
  bgSub:     "#f0ece4",
  bgInput:   "#faf8f4",
  accent:    "#b86a2a",
  accentBg:  "#f3e4d4",
  accentDim: "#d4956a",
  text:      "#2c2620",
  muted:     "#8a7e70",
  dim:       "#c0b8aa",
  border:    "#e4ddd2",
  green:     "#4a7a50",
  greenBg:   "#e6f0e8",
} as const;

export const font = `-apple-system,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif`;
export const fontI = `'Georgia','Times New Roman',serif`;

export const INSTRUMENTS = [
  { id: "guitar",   label: "ギター",     icon: "🎸" },
  { id: "bass",     label: "ベース",     icon: "🪕" },
  { id: "drums",    label: "ドラム",     icon: "🥁" },
  { id: "vocal",    label: "ボーカル",   icon: "🎤" },
  { id: "keyboard", label: "キーボード", icon: "🎹" },
] as const;

export type InstrumentId = typeof INSTRUMENTS[number]["id"];

export const IMAP = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i])) as Record<InstrumentId, typeof INSTRUMENTS[number]>;

export const HINTS: Record<InstrumentId, string> = {
  guitar:   "クロマチック、Fコード、スケール…",
  bass:     "ルート弾き、スラップ、スケール…",
  drums:    "基本ビート、フィル、手足の分離…",
  vocal:    "音階練習、ロングトーン、ブレス…",
  keyboard: "スケール、コード、両手練習…",
};
