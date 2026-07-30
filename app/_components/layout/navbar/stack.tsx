import Image from "next/image";
import Link from "next/link";
import { getHomeHref } from "@/utils/env";
import { getImageUrl } from "@/utils/get-resources-url";
import { navbarFont } from "./font";

const homeHref = getHomeHref();

export const Stack = () => {
	return (
		<Link
			className={`navbar-brand ${navbarFont.className}`}
			href={homeHref}
		>
			<Image
				className="navbar-brand__logo"
				src={getImageUrl("favicon-96.ico")}
				alt="Cloudea's Blog"
				width={50}
				height={50}
			/>
			<h1 className="navbar-brand__title">Cloudea's Blog</h1>
		</Link>
	);
};
