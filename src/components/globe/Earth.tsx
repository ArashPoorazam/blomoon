"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { geoEquirectangular, geoPath } from "d3-geo";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  GLOBE_RADIUS,
  getCountryAtCoordinates,
  getCountryCollection,
  getCountryFeatureByCode,
  type CountryInfo
} from "@/lib/geo";
import type { GlobeTheme } from "@/lib/theme/globe";
import { CountryOutlines } from "./CountryOutlines";
import { vector3ToLatLon } from "./globeMath";

type EarthProps = {
  selectedCountryOutlineColor: string;
  selectedCountryCode: string | null;
  theme: GlobeTheme;
  onCountrySelect: (country: CountryInfo | null) => void;
};

export function Earth({
  selectedCountryOutlineColor,
  selectedCountryCode,
  theme,
  onCountrySelect
}: EarthProps) {
  const texture = useMemo(
    () => createEarthTexture(theme, selectedCountryCode),
    [selectedCountryCode, theme]
  );

  useEffect(() => () => {
    texture.dispose();
  }, [texture]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const coordinates = vector3ToLatLon(event.point);
    onCountrySelect(getCountryAtCoordinates(coordinates.latitude, coordinates.longitude));
  }

  return (
    <>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <CountryOutlines
        selectedCountryCode={selectedCountryCode}
        selectedOutlineColor={selectedCountryOutlineColor}
        theme={theme}
      />
    </>
  );
}

function createEarthTexture(theme: GlobeTheme, selectedCountryCode: string | null) {
  const width = 4096;
  const height = 2048;

  if (typeof document === "undefined") {
    return new THREE.Texture();
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = theme.ocean;
  context.fillRect(0, 0, width, height);

  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])
    .scale(width / (2 * Math.PI))
    .precision(0.2);
  const path = geoPath(projection, context);

  context.fillStyle = theme.land;
  context.beginPath();
  path(getCountryCollection());
  context.fill("evenodd");

  drawSelectedCountry(context, path, theme, selectedCountryCode);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  return texture;
}

function drawSelectedCountry(
  context: CanvasRenderingContext2D,
  path: ReturnType<typeof geoPath>,
  theme: GlobeTheme,
  selectedCountryCode: string | null
) {
  if (!selectedCountryCode) {
    return;
  }

  const selectedCountry = getCountryFeatureByCode(selectedCountryCode);

  if (!selectedCountry) {
    return;
  }

  context.fillStyle = theme.countryHighlight;
  context.globalAlpha = theme.countryHighlightOpacity;
  context.beginPath();
  path(selectedCountry);
  context.fill("evenodd");
  context.globalAlpha = 1;
}
