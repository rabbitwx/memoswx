import { useState } from "react";
import type { MapPoint } from "@/components/map/types";

export interface LocationState {
  placeholder: string;
  position?: MapPoint;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

export const useLocation = (initialLocation?: any) => {
  const initPos = initialLocation?.position || 
    (initialLocation?.latitude && initialLocation?.longitude 
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude } 
      : undefined);

  const [state, setState] = useState<LocationState>({
    placeholder: initialLocation?.placeholder || "",
    position: initPos,
    latitude: initPos?.lat,
    longitude: initPos?.lng,
    lat: initPos?.lat,
    lng: initPos?.lng,
  });

  const [locationInitialized, setLocationInitialized] = useState(Boolean(initPos));

  const handlePositionChange = (position: MapPoint) => {
    setState((prev) => ({
      ...prev,
      position,
      latitude: position.lat,
      longitude: position.lng,
      lat: position.lat,
      lng: position.lng,
    }));
    setLocationInitialized(true);
  };

  const updateCoordinate = (key: "lat" | "lng" | "latitude" | "longitude", value: number) => {
    setState((prev) => {
      const currentLat = key === "lat" || key === "latitude" ? value : prev.latitude ?? 39.9042;
      const currentLng = key === "lng" || key === "longitude" ? value : prev.longitude ?? 116.4074;
      const newPos = { lat: currentLat, lng: currentLng };
      return {
        ...prev,
        position: newPos,
        latitude: currentLat,
        longitude: currentLng,
        lat: currentLat,
        lng: currentLng,
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
    setState({
      placeholder: "",
      position: undefined,
      latitude: undefined,
      longitude: undefined,
      lat: undefined,
      lng: undefined,
    });
    setLocationInitialized(false);
  };

  const getLocation = () => {
    if (!state.position && (!state.latitude || !state.longitude)) return undefined;
    return {
      placeholder: state.placeholder,
      latitude: state.latitude ?? state.position?.lat,
      longitude: state.longitude ?? state.position?.lng,
      position: state.position ?? { lat: state.latitude!, lng: state.longitude! },
    };
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
