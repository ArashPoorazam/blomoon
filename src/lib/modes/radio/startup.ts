import type { TerraDataset } from "../types";
import { getRadioDataset } from "./catalog";
import { logger } from "@/lib/server/logging";

export async function getRadioStartupDataset(): Promise<TerraDataset> {
  try {
    return await getRadioDataset();
  } catch (error) {
    logger.warn("radio.discovery.unavailable", { error, message: "Radio catalog unavailable" });
    return {
      modeId: "radio",
      points: [],
      source: {
        name: "Blomoon radio catalog",
        url: "https://www.radio-browser.info/",
        attribution: "Radio Browser community data and Blomoon curated stations.",
        lastUpdated: new Date(0).toISOString(),
        notice: "The station catalog is temporarily unavailable. Please try again.",
      },
    };
  }
}
