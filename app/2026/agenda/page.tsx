import type { Metadata } from "next";
import { AgendaPage } from "../../../components/EventDetailPages";
import { getCurrentEvent } from "../../../lib/db";
export const metadata: Metadata = {
  title: "會議議程｜2026 保險業風險管理趨勢論壇",
  description: "2026 保險業風險管理趨勢論壇會議議程。",
};
export default async function Page() {
  return <AgendaPage initialEvent={await getCurrentEvent()} />;
}
