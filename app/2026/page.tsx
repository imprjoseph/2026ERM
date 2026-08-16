import HomePage from "../../components/HomePage";
import { getPublishedEvent } from "../../lib/publishedEvent";

export default async function Page() {
  return <HomePage initialEvent={await getPublishedEvent()} />;
}
