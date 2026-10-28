import type { DataSourceInfo } from "../types";

export function createRadioLiveSource(): DataSourceInfo {
  return {
    name: "Radio Browser",
    url: "https://www.radio-browser.info/",
    attribution: "Community radio station data provided by Radio Browser.",
    lastUpdated: new Date().toISOString()
  };
}
