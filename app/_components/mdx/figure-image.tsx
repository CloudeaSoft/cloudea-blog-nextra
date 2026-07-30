import type { ImageProps } from "next/image";
import { ImageZoom } from "nextra/components";
import type { FC, ReactNode } from "react";
import cn from "clsx";

export type FigureImageProps = Omit<ImageProps, "src" | "alt"> & {
	src: ImageProps["src"];
	/** Accessible alt text. Falls back to `title` when `title` is a string. */
	alt?: string;
	/** Caption rendered under the image. */
	title?: ReactNode;
	className?: string;
};

/**
 * Centered Nextra ImageZoom with an optional bottom caption.
 * Resolve local asset paths with `getImageUrl` at the call site.
 */
export const FigureImage: FC<FigureImageProps> = ({
	src,
	alt,
	title,
	className,
	...imageProps
}) => {
	const resolvedAlt =
		alt ?? (typeof title === "string" ? title : "");

	return (
		<figure className={cn("figure-image", className)}>
			<ImageZoom
				src={src}
				alt={resolvedAlt}
				{...imageProps}
			/>
			{title != null && title !== "" && (
				<figcaption className="figure-image__caption">
					{title}
				</figcaption>
			)}
		</figure>
	);
};
