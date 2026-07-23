import Link from "next/link";
import { CloudeaImage } from "@/app/_components/ui/image";
import { getHomeHref } from "@/utils/env";
import { navbarFont } from "./font";

const homeHref = getHomeHref();

export const Stack = () => {
	return (
		<Link
			className={`navbar-brand ${navbarFont.className}`}
			href={homeHref}
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
