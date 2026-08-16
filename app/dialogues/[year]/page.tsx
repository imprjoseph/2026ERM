import { DialogueDetail } from "../../../components/EventDetailPages";
import { getCurrentEvent } from "../../../lib/db";

export default async function Page({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const [{ year }, event] = await Promise.all([params, getCurrentEvent()]);
  return <DialogueDetail year={year} initialEvent={event} />;
}
