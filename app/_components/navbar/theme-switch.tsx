"use client";

import { useTheme } from "next-themes";
import { Button } from "nextra/components";
import { useMounted } from "nextra/hooks";
import { MoonIcon, SunIcon } from "nextra/icons";

export function ThemeSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const ShowIcon = mounted && isDark ? MoonIcon : SunIcon;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          borderRadius: "12px",
          border: "1px solid",
          width: 24,
          height: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Button
          aria-label="Toggle Color Mode"
          className="x:p-2"
          onClick={toggleTheme}
        >
          <ShowIcon height="12" />
        </Button>
      </div>
    </div>
  );
}
