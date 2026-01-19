"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "./ui/button";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "system";
}

export function ThemeToggle() {
  const [preference, setPreference] = React.useState<ThemePreference>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = getStoredPreference();
    setPreference(stored);
    applyTheme(stored === "system" ? getSystemTheme() : stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredPreference() === "system") {
        applyTheme(getSystemTheme());
      }
    };

    if (media.addEventListener) {
      media.addEventListener("change", onChange);
    } else {
      media.addListener(onChange);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", onChange);
      } else {
        media.removeListener(onChange);
      }
    };
  }, []);

  const effectiveTheme =
    preference === "system" ? (typeof window === "undefined" ? "light" : getSystemTheme()) : preference;

  function handleToggle() {
    const next = effectiveTheme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    applyTheme(next);
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={handleToggle}>
      {mounted ? effectiveTheme === "dark" ? <Sun /> : <Moon /> : null}
    </Button>
  );
}
