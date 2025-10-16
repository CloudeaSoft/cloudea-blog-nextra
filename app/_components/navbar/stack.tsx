import Link from "next/link";
import { CloudeaImage } from "../image";
import { Noto_Sans } from "next/font/google";

const notoSans = Noto_Sans({ weight: "500", subsets: ["latin"] });

export const Stack = () => {
	return (
		<Link
			style={{
				display: "flex",
				alignItems: "center",
				padding: "0 3rem",
				gap: 20,
			}}
			href={process.env.NEXT_PUBLIC_BASE_PATH}
		>
			<CloudeaImage
				src="favicon-96.ico"
				alt="Cloudea's Blog"
				width={50}
				height={50}
			/>
			<h1
				className={notoSans.className}
				style={{ fontSize: "1.7rem", fontWeight: "520" }}
			>
				Cloudea's Blog
			</h1>
		</Link>
	);
};
