import type { Metadata } from "next";
import { AgendaPage } from "../../../components/EventDetailPages";
export const metadata: Metadata = {
  title: "會議議程｜2026 保險業風險管理趨勢論壇",
  description: "2026 保險業風險管理趨勢論壇會議議程。",
};
export default function Page() {
  return <AgendaPage />;
}
