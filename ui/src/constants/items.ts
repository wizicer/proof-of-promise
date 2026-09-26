import {
  Baby, BatteryCharging, BookOpen, Cable, CalendarCheck2, Headphones,
  Luggage, PackageCheck, PackageOpen, PlugZap, Store, Umbrella, Unplug, Wrench,
  type LucideIcon,
} from "lucide-react";

export const itemOptions: { label: string; icon: LucideIcon; iconName: string }[] = [
  { label: "Power bank", icon: BatteryCharging, iconName: "BatteryCharging" },
  { label: "Charger", icon: PlugZap, iconName: "PlugZap" },
  { label: "Charging cable", icon: Cable, iconName: "Cable" },
  { label: "Adapter", icon: Unplug, iconName: "Unplug" },
  { label: "Umbrella", icon: Umbrella, iconName: "Umbrella" },
  { label: "Book", icon: BookOpen, iconName: "BookOpen" },
  { label: "Tools", icon: Wrench, iconName: "Wrench" },
  { label: "Headphones", icon: Headphones, iconName: "Headphones" },
];

export const merchantItemOptions: { label: string; icon: LucideIcon; iconName: string }[] = [
  { label: "Mall Stroller", icon: Baby, iconName: "Baby" },
  { label: "Shared Umbrella", icon: Umbrella, iconName: "Umbrella" },
  { label: "Power Bank", icon: BatteryCharging, iconName: "BatteryCharging" },
  { label: "Wheelchair / Cart", icon: Luggage, iconName: "Luggage" },
  { label: "Tool Kit", icon: Wrench, iconName: "Wrench" },
  { label: "Headphones / Audio", icon: Headphones, iconName: "Headphones" },
];

export const iconMap: Record<string, LucideIcon> = {
  BatteryCharging,
  PlugZap,
  Cable,
  Unplug,
  Umbrella,
  BookOpen,
  Wrench,
  Headphones,
  Baby,
  Luggage,
  Store,
  CalendarCheck2,
  PackageCheck,
  PackageOpen,
};

export function resolvePromiseIcon(iconName?: string, defaultIcon: LucideIcon = PackageCheck): LucideIcon {
  if (iconName && iconMap[iconName]) return iconMap[iconName];
  return defaultIcon;
}
