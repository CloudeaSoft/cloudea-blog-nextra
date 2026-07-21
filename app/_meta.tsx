import type { MetaRecord } from "nextra";
import { NavTitle } from "@/app/_components/layout/navbar/nav-title";

const meta: MetaRecord = {
	index: {
		title: <NavTitle icon="mdi:home-outline">Home</NavTitle>,
		type: "page",
	},
	// docs: {
	//   title: "Documentation",
	//   type: "page",
	//   items: {
	//     "one-level": "",
	//   },
	// },
	archives: {
		title: <NavTitle icon="mdi:archive-outline">Archives</NavTitle>,
		type: "page",
		href: "/posts",
	},
	about: {
		title: <NavTitle icon="mdi:account-outline">About</NavTitle>,
		type: "menu",
		items: {
			me: {
				title: <NavTitle icon="mdi:emoticon-outline">Me</NavTitle>,
				href: "/about",
			},
		},
	},
};

export default meta;
