import Link from "next/link";
import { CloudeaImage } from "@/app/_components/ui/image";
import { Noto_Sans } from "next/font/google";

const notoSans = Noto_Sans({ weight: "500", subsets: ["latin"] });
const url =
	process.env.NEXT_PUBLIC_BASE_URL! + process.env.NEXT_PUBLIC_BASE_PATH;
const homeURL = new URL(url);

export const Stack = () => {
	return (
		<Link
			className="navbar-brand"
			href={homeURL.toString()}
		>
			<CloudeaImage
				className="navbar-brand__logo"
				src="favicon-96.ico"
				alt="Cloudea's Blog"
				width={50}
				height={50}
			/>
			<h1 className={`${notoSans.className} navbar-brand__title`}>
				Cloudea's Blog
			</h1>
		</Link>
	);
};
