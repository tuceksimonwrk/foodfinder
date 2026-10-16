import { get, set } from 'idb-keyval';

/** Persistent storage; failures (private mode, blocked storage) never throw. */
export async function getJSON<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key);
  } catch {
    return undefined;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch {
    /* storage unavailable: the app keeps working without persistence */
  }
}
