import { ensureDatabase, getCurrentEvent } from "./db";
import type { EventData } from "./types";

let publishedEventSnapshot: Promise<EventData> | null = null;

/**
 * Public pages use one published snapshot per running site instance.
 * A new deployment starts a fresh instance and loads the newly approved data.
 */
export function getPublishedEvent(): Promise<EventData> {
  publishedEventSnapshot ??= ensureDatabase()
    .then(() => getCurrentEvent())
    .catch((error) => {
      publishedEventSnapshot = null;
      throw error;
    });
  return publishedEventSnapshot;
}
