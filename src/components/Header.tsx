import { t, font } from "../theme";

type Props = { sub: string; title: string };

export function Header({ sub, title }: Props) {
  return (
    <div style={{
      padding: "48px 18px 14px",
      background: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      marginBottom: 4,
    }}>
      <div style={{ fontSize: 11, color: t.muted, marginBottom: 3, fontFamily: font }}>{sub}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: t.text, fontFamily: font }}>{title}</div>
    </div>
  );
}
