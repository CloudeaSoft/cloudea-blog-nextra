"use-client";

import Link from "next/link";
import { MenuIcon } from "nextra/icons";

const mail = "cloudeasoft@qq.com";

export const Email = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Link href={`mailto:${mail}`} target="_blank">
        <MenuIcon height="24" />
      </Link>
    </div>
  );
};
