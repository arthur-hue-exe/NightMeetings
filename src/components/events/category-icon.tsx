import { Bike, Fuel, HeartHandshake, MoonStar, Sparkles, Users, Wrench, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  ENCONTRO_POSTO: Fuel,
  ROLE_NOTURNO: MoonStar,
  PASSEIO_GRUPO: Users,
  ENCONTRO_ESPORTIVAS: Zap,
  ENCONTRO_CUSTOM: Wrench,
  EVENTO_BENEFICENTE: HeartHandshake,
  EXPOSICAO: Bike,
  OUTROS: Sparkles,
};

export function CategoryIcon({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const Icon = ICONS[value] ?? Sparkles;
  return <Icon className={cn("size-5", className)} aria-hidden="true" />;
}
