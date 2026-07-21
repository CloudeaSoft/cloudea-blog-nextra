import Link from "next/link";
import { CloudeaImage } from "@/app/_components/ui/image";
import { navbarFont } from "./font";

const url =
	process.env.NEXT_PUBLIC_BASE_URL! + process.env.NEXT_PUBLIC_BASE_PATH;
const homeURL = new URL(url);

export const Stack = () => {
	return (
		<Link
			className={`navbar-brand ${navbarFont.className}`}
			href={homeURL.toString()}
		>
			<CloudeaImage
				className="navbar-brand__logo"
				src="favicon-96.ico"
				alt="Cloudea's Blog"
				width={50}
				height={50}
			/>
			<h1 className="navbar-brand__title">Cloudea's Blog</h1>
		</Link>
	);
};
