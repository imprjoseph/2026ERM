import type { Metadata } from "next";
import RegisterPage from "../../components/RegisterPage";
import { getPublishedEvent } from "../../lib/publishedEvent";

export const metadata: Metadata = {
  title: "報名申請｜2026 保險業風險管理趨勢論壇",
  robots: { index: false, follow: false },
};

export default async function Page() {
  return <RegisterPage initialEvent={await getPublishedEvent()} />;
}
