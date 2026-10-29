import Image from "next/image";
import type { ComponentProps } from "react";
import { shouldBypassImageOptimizer } from "@/lib/image-urls";

/** Uploads locais e do Blob já chegam otimizados (WebP); o otimizador do Next é dispensado. */
export function EventImage({ src, ...props }: ComponentProps<typeof Image>) {
  const bypassOptimizer = typeof src === "string" && shouldBypassImageOptimizer(src);
  return <Image src={src} unoptimized={bypassOptimizer} {...props} />;
}
