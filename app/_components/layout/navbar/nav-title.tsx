import { Icon } from "@iconify-icon/react";
import type { ReactNode } from "react";

export function NavTitle({
	icon,
	children,
}: {
	icon: string;
	children: ReactNode;
}) {
	return (
		<span className="navbar-link__title">
			<Icon
				icon={icon}
				className="navbar-link__icon"
				width="1.25rem"
				height="1.25rem"
			/>
			<span className="navbar-link__label">{children}</span>
		</span>
	);
}
