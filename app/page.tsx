import { relative } from "path";
import { GetHitokoto } from "../utils/hitokoto";
import PostsPage from "./posts/page";
import { Github } from "./_components/navbar/github";
import { Email } from "./_components/navbar/email";
import { CloudeaImage } from "./_components/image";
import Link from "next/link";

const Banner = async () => {
  const hito = await GetHitokoto();
  return (
    <div
      style={{
        height: "calc(100dvh - 4rem)",
        position: "relative",
        display: "flex",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "3rem",
          lineHeight: 1.2,

          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        Hi! Here is Cloudea.
        {hito != null && (
          <p style={{ fontSize: "1.5rem" }}>
            {hito.hitokoto} —— {hito.from_who ?? hito.from}
          </p>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "15px 20px",
          background: "rgba(200,200,200,0.2)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(100,100,100,0.5)",
          borderRadius: "30px",

          display: "flex",
          gap: 20,
        }}
      >
        <Github />
        <Email />
      </div>
    </div>
  );
};

const Content = async ({ children }) => {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ width: "240px", height: "auto", margin: "0 38px" }}>
        <div style={{ position: "sticky", top: "4rem" }}>
          <div
            style={{
              padding: "20px",
              borderRadius: "18px",
              textAlign: "center",
              alignItems: "center",
              background: "gray",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <CloudeaImage
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  width: "80px",
                  height: "80px",
                }}
                src="avatar.jpg"
                alt="CloudeaSoft"
                width={80}
                height={80}
              />
            </div>
            <div>
              <div>Cloudea</div>
              <div>---</div>
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ width: "5rem" }}>xxx</div>
              <div style={{ width: "5rem" }}>xxx</div>
              <div style={{ width: "5rem" }}>xxx</div>
            </div>
          </div>
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              borderRadius: "18px",
              textAlign: "center",
              alignItems: "center",
              background: "gray",
            }}
          >
            <Link href="/tags">Tags</Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default async function Index(props) {
  return (
    <>
      <Banner />
      <Content>
        <PostsPage />
      </Content>
    </>
  );
}
