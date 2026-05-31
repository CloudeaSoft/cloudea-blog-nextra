import { MetaRecord } from "nextra";

const meta: MetaRecord = {
	index: {
		title: "Home",
		type: "page",
	},
	// docs: {
	//   title: "Documentation",
	//   type: "page",
	//   items: {
	//     "one-level": "",
	//   },
	// },
	// archive: {
	//   title: "Timeline",
	//   type: "page",
	// },
	categories: {
		title: "Categories",
		type: "page",
	},
	about: {
		title: "About",
		type: "menu",
		items: {
			me: {
				title: "Me",
				href: "/about",
			},
		},
	},
};

export default meta;
