import type { Metadata } from "next";
import { SpeakerDetail } from "../../../../components/EventDetailPages";
import { getCurrentEvent } from "../../../../lib/db";

export const metadata: Metadata = {
  title: "講者詳細資料｜2026 保險業風險管理趨勢論壇",
  description: "2026 保險業風險管理趨勢論壇講者資料、演講主題與簡介。",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, event] = await Promise.all([params, getCurrentEvent()]);
  return <SpeakerDetail speakerId={id} initialEvent={event} />;
}
