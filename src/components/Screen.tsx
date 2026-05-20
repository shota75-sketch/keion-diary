import type { ReactNode } from "react";
import { t } from "../theme";

type Props = { children: ReactNode };

export function Screen({ children }: Props) {
  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      padding: "0 0 80px",
      overflowY: "auto",
      background: t.bg,
    }}>
      {children}
    </div>
  );
}
