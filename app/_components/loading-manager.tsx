"use client";

import { useState, useEffect } from "react";
import "./loading-manager.scss";
import { CloudeaImage } from "./image";
import { M_PLUS_Rounded_1c } from "next/font/google";

const mPlusRounded1c = M_PLUS_Rounded_1c({
  weight: "400",
  subsets: ["latin"],
});

export default function TagPage(props) {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // 在客户端执行
    if (typeof window !== "undefined") {
      // 如果页面已经加载完成，则直接设置加载状态为 false
      if (document.readyState === "complete") {
        setIsLoading(false);
        return;
      }

      // 监听 window.onload 事件
      const handleLoad = () => {
        setIsLoading(false);
      };

      window.addEventListener("load", handleLoad);

      // 组件卸载时移除事件监听
      return () => {
        window.removeEventListener("load", handleLoad);
      };
    }
  }, []);

  return (
    <>
      {isLoading && (
        <div
          className="loader-bg"
          style={{
            position: "fixed",
            background: "white",
            zIndex: 9999,
            width: 100 + "%",
            height: 100 + "%",
          }}
        >
          <p id="loading" className={mPlusRounded1c.className}>
            <span className="spac">
              その歌声は
              <span style={{ display: "inline-block", marginRight: "-0.3rem" }}>
                、
              </span>
              春風と共に
            </span>
            ──
          </p>
          <div className="loading-bg">
            <CloudeaImage
              className="sakura-1"
              src="loading-bg.gif"
              alt="sakura"
              width={240}
              height={240}
              priority={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
