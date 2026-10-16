import { useCallback, useEffect, useState } from 'react';
import type { NutritionOverrides, Store } from '@foodfinder/shared';
import { getJSON, setJSON } from './db';

export interface Settings {
  kcal: number;
  proteinMin: number;
  fatMax: number;
  favoriteStores: Store[];
  fitMinProtein: number;
  fitMaxFat: number;
}

export const DEFAULT_SETTINGS: Settings = {
  kcal: 2200, proteinMin: 150, fatMax: 70, favoriteStores: [], fitMinProtein: 15, fitMaxFat: 8,
};

/** Persisted value with a `loaded` flag so views can wait for stored values before reading defaults. */
function usePersisted<T>(key: string, initial: T): [T, (next: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJSON<T>(key).then((stored) => {
      if (stored !== undefined) setValue(stored);
      setLoaded(true);
    });
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      void setJSON(key, next);
    },
    [key],
  );
  return [value, update, loaded];
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void, boolean] {
  const [stored, save, loaded] = usePersisted<Settings>('settings', DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const update = useCallback((patch: Partial<Settings>) => save({ ...settings, ...patch }), [save, settings]);
  return [settings, update, loaded];
}

export function useLocalOverrides(): [NutritionOverrides, (next: NutritionOverrides) => void] {
  const [overrides, save] = usePersisted<NutritionOverrides>('local-overrides', {});
  return [overrides, save];
}
