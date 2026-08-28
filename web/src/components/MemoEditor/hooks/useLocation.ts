import { useState } from "react";
import type { MapPoint } from "@/components/map/types";

const AMAP_KEY = "58fdd188849b29db42d76508868bf452";

export interface LocationState {
  placeholder: string;
  position?: MapPoint;
}

export const useLocation = (initialLocation?: LocationState) => {
  const [state, setState] = useState<LocationState>(
    initialLocation ?? {
      placeholder: "",
      position: undefined,
    }
  );
  const [locationInitialized, setLocationInitialized] = useState(Boolean(initialLocation?.position));

  const handlePositionChange = (position: MapPoint) => {
    setState((prev) => ({
      ...prev,
      position,
    }));
    setLocationInitialized(true);
  };

  const updateCoordinate = (key: "lat" | "lng", value: number) => {
    setState((prev) => {
      const position = prev.position ?? { lat: 39.9042, lng: 116.4074 };
      return {
        ...prev,
        position: {
          ...position,
          [key]: value,
        },
      };
    });
    setLocationInitialized(true);
  };

  const setPlaceholder = (placeholder: string) => {
    setState((prev) => ({
      ...prev,
      placeholder,
    }));
  };

  const reset = () => {
    setState(
      initialLocation ?? {
        placeholder: "",
        position: undefined,
      }
    );
    setLocationInitialized(Boolean(initialLocation?.position));
  };

  const getLocation = () => {
    if (!state.position) return undefined;
    return state;
  };

  return {
    state,
    locationInitialized,
    handlePositionChange,
    updateCoordinate,
    setPlaceholder,
    reset,
    getLocation,
  };
};
