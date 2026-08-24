import { TerravueApp } from "@/components/TerravueApp";
import { getRadioFixtureDataset } from "@/lib/modes/radio";

export default function Home() {
  return (
    <TerravueApp
      initialDatasets={{
        radio: getRadioFixtureDataset()
      }}
    />
  );
}
