import { BlomoonApp } from "@/components/BlomoonApp";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getRadioFixtureDataset } from "@/lib/modes/radio";

export default function Home() {
  return (
    <BlomoonApp
      appConfig={getAppClientConfig()}
      initialDatasets={{
        radio: getRadioFixtureDataset()
      }}
    />
  );
}
