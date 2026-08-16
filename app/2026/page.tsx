import HomePage from "../../components/HomePage";
import { getCurrentEvent } from "../../lib/db";

export default async function Page() {
  return <HomePage initialEvent={await getCurrentEvent()} />;
}
