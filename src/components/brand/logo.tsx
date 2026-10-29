import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  href = "/",
  withWordmark = true,
  className,
  priority = false,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  withWordmark?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const dimensions = {
    sm: { box: 36, text: "text-lg" },
    md: { box: 44, text: "text-xl" },
    lg: { box: 56, text: "text-2xl" },
    xl: { box: 88, text: "text-4xl" },
  }[size];

  const content = (
    <span className={cn("group inline-flex items-center gap-3", className)}>
      <span
        className="relative shrink-0 rounded-xl transition duration-300 group-hover:drop-shadow-[0_0_14px_rgba(168,85,247,0.55)]"
        style={{ width: dimensions.box, height: dimensions.box }}
      >
        <Image
          src="/images/logo-mark.png"
          alt="Emblema MotorMeetings"
          fill
          sizes={`${dimensions.box}px`}
          priority={priority}
          className="object-contain"
        />
      </span>
      {withWordmark ? (
        <span className={cn("display leading-none tracking-[0.06em]", dimensions.text)}>
          <span className="text-fog">MOTOR</span>
          <span className="text-gradient">MEETINGS</span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="MotorMeetings — página inicial"
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
    >
      {content}
    </Link>
  );
}
