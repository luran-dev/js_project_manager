import { useLayoutEffect, useState } from "react";

export const PALETTES = ["teal", "blue", "violet", "slate"] as const;
export const APPEARANCES = ["light", "dark", "system"] as const;
export type Palette = typeof PALETTES[number];
export type Appearance = typeof APPEARANCES[number];
export type ThemePreference = { readonly palette: Palette; readonly appearance: Appearance };
const paletteKey = "projectvibe.palette";
const appearanceKey = "projectvibe.appearance";

export const parsePalette = (value: string | null): Palette => PALETTES.find((palette) => palette === value) ?? "teal";
export const parseAppearance = (value: string | null): Appearance => APPEARANCES.find((appearance) => appearance === value) ?? "system";

export function readTheme(): ThemePreference {
  try {
    return { palette: parsePalette(localStorage.getItem(paletteKey)), appearance: parseAppearance(localStorage.getItem(appearanceKey)) };
  } catch (error) {
    if (error instanceof DOMException) return { palette: "teal", appearance: "system" };
    throw error;
  }
}

export function applyTheme(preference: ThemePreference, systemDark: boolean): void {
  document.documentElement.dataset["palette"] = preference.palette;
  document.documentElement.dataset["appearance"] = preference.appearance === "system" ? (systemDark ? "dark" : "light") : preference.appearance;
}

export function useTheme() {
  const [preference, setPreference] = useState(readTheme);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(preference, media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  const changeTheme = (next: ThemePreference) => {
    setPreference(next);
    try {
      localStorage.setItem(paletteKey, next.palette);
      localStorage.setItem(appearanceKey, next.appearance);
      setStorageAvailable(true);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      setStorageAvailable(false);
    }
  };

  return { preference, changeTheme, storageAvailable };
}
