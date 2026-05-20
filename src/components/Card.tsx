import type { CSSProperties, ReactNode } from "react";
import { t } from "../theme";

type Props = { children: ReactNode; style?: CSSProperties };

export function Card({ children, style }: Props) {
  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: 14,
      margin: "8px 14px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}
