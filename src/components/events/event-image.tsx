import Image from "next/image";
import type { ComponentProps } from "react";

/** Imagens enviadas ficam no storage privado servido por /uploads; já são otimizadas no upload. */
export function EventImage({ src, ...props }: ComponentProps<typeof Image>) {
  const isUpload = typeof src === "string" && src.startsWith("/uploads/");
  return <Image src={src} unoptimized={isUpload} {...props} />;
}
