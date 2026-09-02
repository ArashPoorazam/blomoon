"use client";

import { Podcast, Radio, Tv, type LucideIcon } from "lucide-react";
import type { TerraMode } from "@/lib/modes/types";

export const modeIcons = {
  podcast: Podcast,
  radio: Radio,
  tv: Tv
} satisfies Record<TerraMode["controlIcon"], LucideIcon>;
