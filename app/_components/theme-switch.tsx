"use client";

import { useTheme } from "next-themes";
import { Button } from "nextra/components";
import { useMounted } from "nextra/hooks";
import { MoonIcon, SunIcon } from "nextra/icons";

export function ThemeSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  // TODO: system theme
  const setThemeLight = () => {
    setTheme("light");
  };

  const setThemeDark = () => {
    setTheme("dark");
  };

  return (
    <div style={{ display: "flex" }}>
      <Button
        aria-label="Toggle Light Mode"
        className="x:p-2"
        onClick={setThemeLight}
      >
        <SunIcon height="14" />
      </Button>
      <Button
        aria-label="Toggle Dark Mode"
        className="x:p-2"
        onClick={setThemeDark}
      >
        <MoonIcon height="14" />
      </Button>
    </div>
  );
}
