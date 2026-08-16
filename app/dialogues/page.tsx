import type { Metadata } from "next";
import { DialoguesPage } from "../../components/EventDetailPages";
import { getCurrentEvent } from "../../lib/db";

export const metadata: Metadata = {
  title: "歷年對話｜保險業風險管理趨勢論壇",
  description: "持續累積保險業風險管理、資本策略與制度發展的年度觀點。",
};

export default async function Page() {
  const event = await getCurrentEvent();
  return <DialoguesPage initialEvent={event} />;
}
