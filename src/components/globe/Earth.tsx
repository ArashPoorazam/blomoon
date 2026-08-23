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

const EARTH_TEXTURE_WIDTH = 4096;
const EARTH_TEXTURE_HEIGHT = 2048;
const HIGHLIGHT_TEXTURE_WIDTH = 1024;
const HIGHLIGHT_TEXTURE_HEIGHT = 512;
const EARTH_WIDTH_SEGMENTS = 96;
const EARTH_HEIGHT_SEGMENTS = 64;
const COUNTRY_HIGHLIGHT_ALTITUDE = 1.00045;

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
    () => createEarthTexture(theme),
    [theme]
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
        <sphereGeometry args={[GLOBE_RADIUS, EARTH_WIDTH_SEGMENTS, EARTH_HEIGHT_SEGMENTS]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <SelectedCountryOverlay
        selectedCountryCode={selectedCountryCode}
        theme={theme}
      />
      <CountryOutlines
        selectedCountryCode={selectedCountryCode}
        selectedOutlineColor={selectedCountryOutlineColor}
        theme={theme}
      />
    </>
  );
}

function createEarthTexture(theme: GlobeTheme) {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = EARTH_TEXTURE_WIDTH;
  canvas.height = EARTH_TEXTURE_HEIGHT;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = theme.ocean;
  context.fillRect(0, 0, EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT);

  const path = createTexturePath(context, EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT);

  context.fillStyle = theme.land;
  context.beginPath();
  path(getCountryCollection());
  context.fill("evenodd");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  return texture;
}

function SelectedCountryOverlay({
  selectedCountryCode,
  theme
}: {
  selectedCountryCode: string | null;
  theme: GlobeTheme;
}) {
  const texture = useMemo(
    () => createSelectedCountryTexture(theme, selectedCountryCode),
    [selectedCountryCode, theme]
  );

  useEffect(() => () => {
    texture?.dispose();
  }, [texture]);

  if (!texture) {
    return null;
  }

  return (
    <mesh raycast={ignoreRaycast}>
      <sphereGeometry
        args={[
          GLOBE_RADIUS * COUNTRY_HIGHLIGHT_ALTITUDE,
          EARTH_WIDTH_SEGMENTS,
          EARTH_HEIGHT_SEGMENTS
        ]}
      />
      <meshBasicMaterial
        depthTest
        depthWrite={false}
        map={texture}
        opacity={theme.countryHighlightOpacity}
        transparent
      />
    </mesh>
  );
}

function ignoreRaycast() {}

function createSelectedCountryTexture(theme: GlobeTheme, selectedCountryCode: string | null) {
  if (!selectedCountryCode || typeof document === "undefined") {
    return null;
  }

  const selectedCountry = getCountryFeatureByCode(selectedCountryCode);

  if (!selectedCountry) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = HIGHLIGHT_TEXTURE_WIDTH;
  canvas.height = HIGHLIGHT_TEXTURE_HEIGHT;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const path = createTexturePath(context, HIGHLIGHT_TEXTURE_WIDTH, HIGHLIGHT_TEXTURE_HEIGHT);

  context.clearRect(0, 0, HIGHLIGHT_TEXTURE_WIDTH, HIGHLIGHT_TEXTURE_HEIGHT);
  context.fillStyle = theme.countryHighlight;
  context.beginPath();
  path(selectedCountry);
  context.fill("evenodd");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createTexturePath(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])
    .scale(width / (2 * Math.PI))
    .precision(0.2);

  return geoPath(projection, context);
}
