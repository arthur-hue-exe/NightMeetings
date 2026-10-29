import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition duration-200 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand to-brand-light text-white shadow-[0_12px_30px_-12px_rgba(128,0,255,0.8)] hover:shadow-[0_18px_40px_-14px_rgba(168,85,247,0.9)] hover:brightness-110 active:brightness-95",
  secondary:
    "border border-white/12 bg-white/[0.045] text-fog hover:border-brand-light/45 hover:bg-white/[0.08]",
  ghost: "text-ash hover:bg-white/[0.06] hover:text-fog",
  outline:
    "border border-brand/45 bg-transparent text-brand-light hover:border-brand-light hover:bg-brand/10",
  danger:
    "border border-red-500/35 bg-red-500/10 text-red-300 hover:border-red-400/60 hover:bg-red-500/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm sm:h-[3.25rem] sm:px-7",
  icon: "h-10 w-10",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}
