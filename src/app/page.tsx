import { TerravueApp } from "@/components/TerravueApp";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getRadioFixtureDataset } from "@/lib/modes/radio";

export default function Home() {
  return (
    <TerravueApp
      appConfig={getAppClientConfig()}
      initialDatasets={{
        radio: getRadioFixtureDataset()
      }}
    />
  );
}
