"use client";

import { useTheme } from "next-themes";
import { getImageUrl } from "../../utils/get-resources-url";
import { useMounted } from "nextra/hooks";

export const Background = () => {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const url = getImageUrl(
    resolvedTheme === "light" && mounted
      ? "wallhaven-wqery6-light.webp"
      : "wallhaven-wqery6-dark.webp"
  );

  return (
    <div
      style={{
        zIndex: -1,
        position: "fixed",
        top: 0,
        height: "100dvh",
        width: "100%",
        background: `center no-repeat`,
        backgroundSize: "cover",
        backgroundImage: `url(${url})`,
      }}
    ></div>
  );
};
