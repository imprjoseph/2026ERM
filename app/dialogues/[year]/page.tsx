import { DialogueDetail } from "../../../components/EventDetailPages";
import { getPublishedEvent } from "../../../lib/publishedEvent";

export default async function Page({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const [{ year }, event] = await Promise.all([params, getPublishedEvent()]);
  return <DialogueDetail year={year} initialEvent={event} />;
}
