'use client'

import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { getImageUrl } from "../../utils/get-resources-url";

type CloudeaImageProps = {
  className?: string;
  src: string | StaticImport;
  width?: number;
  height?: number;
  alt: string;
  sizes?: string;
  priority?:boolean
};

export const CloudeaImage = (props: CloudeaImageProps) => {
  const src =
    typeof props.src === "string" ? getImageUrl(props.src) : props.src;

  return (
    <>
      <Image
        className={props.className}
        src={src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        sizes={props.sizes}
        priority={props.priority}
      ></Image>
    </>
  );
};
