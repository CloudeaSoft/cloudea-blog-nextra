import type { FC } from "react";

export const Footer: FC = () => {
  return (
    <footer
      style={{
        background: "lightsalmon",
        padding: 20,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div>Powered by Nextra {new Date().getFullYear()}</div>
        <div>THEME Cloudea</div>
      </div>
      <div>
        © 2022 - 2025 Cloudea
        <br />
        12 posts in total 8.4k words in total
        <br />
      </div>
      <div>
        VISITOR COUNT 666
        <br />
        TOTAL PAGE VIEWS 1142
      </div>
    </footer>
  );
};
