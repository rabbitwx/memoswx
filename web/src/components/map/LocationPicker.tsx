import L, { LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLinkIcon, LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { cn } from "@/lib/utils";
import { defaultMarkerIcon, ThemedTileLayer } from "./map-utils";
import type { MapPoint } from "./types";

const AMAP_KEY = "58fdd188849b29db42d76508868bf452";

const toLatLng = (point: MapPoint): LatLng => new LatLng(point.lat, point.lng);
const fromLatLng = (latlng: LatLng): MapPoint => ({ lat: latlng.lat, lng: latlng.lng });

interface LocationMarkerProps {
  position: LatLng | undefined;
  onChange: (position: MapPoint) => void;
  readonly?: boolean;
}

const LocationMarker = ({ position: initialPosition, onChange, readonly: readOnly }: LocationMarkerProps) => {
  const [position, setPosition] = useState(initialPosition);

  useMapEvents({
    click(e) {
      if (readOnly) return;
      setPosition(e.latlng);
      onChange(fromLatLng(e.latlng));
    },
  });

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    } else {
      setPosition(undefined);
    }
  }, [initialPosition]);

  return position === undefined ? null : <Marker position={position} icon={defaultMarkerIcon}></Marker>;
};

interface GlassButtonProps {
  icon: ReactNode;
  onClick: () => void;
  ariaLabel: string;
  title: string;
}

const GlassButton = ({ icon, onClick, ariaLabel, title }: GlassButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        "inline-flex items-center justify-center h-8 w-8 rounded-lg",
        "border border-border/80 bg-background/88 text-foreground shadow-sm backdrop-blur-md",
        "hover:scale-105 hover:bg-background hover:shadow-md active:scale-95",
      )}
    >
      {icon}
    </button>
  );
};

interface ControlButtonsProps {
  position: MapPoint | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onOpenAmap: () => void;
}

const ControlButtons = ({ position, onZoomIn, onZoomOut, onLocate, onOpenAmap }: ControlButtonsProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      {position && (
        <GlassButton
          icon={<ExternalLinkIcon size={16} className="text-foreground" />}
          onClick={onOpenAmap}
          ariaLabel="在高德地图中打开"
          title="在高德地图中打开"
        />
      )}
      <GlassButton
        icon={<LocateFixedIcon size={16} className="text-foreground" />}
        onClick={onLocate}
        ariaLabel="定位到当前位置"
        title="定位到当前位置"
      />
      <GlassButton icon={<PlusIcon size={16} className="text-foreground" />} onClick={onZoomIn} ariaLabel="放大" title="放大" />
      <GlassButton icon={<MinusIcon size={16} className="text-foreground" />} onClick={onZoomOut} ariaLabel="缩小" title="缩小" />
    </div>
  );
};

class MapControlsContainer extends L.Control {
  private container: HTMLDivElement | undefined = undefined;

  onAdd() {
    this.container = L.DomUtil.create("div", "");
    this.container.style.pointerEvents = "auto";
    L.DomEvent.disableClickPropagation(this.container);
    L.DomEvent.disableScrollPropagation(this.container);
    return this.container;
  }

  onRemove() {
    this.container = undefined;
  }

  getContainer() {
    return this.container;
  }
}

interface MapControlsProps {
  position: MapPoint | undefined;
  onLocationSelect?: (position: MapPoint) => void;
}

const MapControls = ({ position, onLocationSelect }: MapControlsProps) => {
  const map = useMap();
  const controlRef = useRef<MapControlsContainer | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const handleOpenInAmap = () => {
    if (!position) return;
    const url = `https://uri.amap.com/marker?position=${position.lng},${position.lat}&name=选定位置`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // 混合定位：优先硬件 GPS，失败则无缝降级为高德 IP 城市定位
  const handleLocate = async () => {
    const tryAmapIpLocation = async () => {
      try {
        const res = await fetch(`https://restapi.amap.com/v3/ip?key=${AMAP_KEY}`);
        const data = await res.json();
        if (data.status === "1" && data.rectangle && typeof data.rectangle === "string") {
          const points = data.rectangle.split(";")[0].split(",");
          const lng = parseFloat(points[0]);
          const lat = parseFloat(points[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            map.setView(new LatLng(lat, lng), 12);
            onLocationSelect?.({ lat, lng });
            return true;
          }
        }
      } catch (e) {
        console.error("高德 IP 定位失败:", e);
      }
      return false;
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          map.setView(new LatLng(currentPoint.lat, currentPoint.lng), 15);
          onLocationSelect?.(currentPoint);
        },
        async () => {
          // GPS 失败或被阻止时，自动使用高德 IP 定位
          await tryAmapIpLocation();
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      await tryAmapIpLocation();
    }
  };

  useEffect(() => {
    const control = new MapControlsContainer({ position: "topright" });
    controlRef.current = control;
    control.addTo(map);
    setContainer(control.getContainer() ?? null);

    return () => {
      if (controlRef.current) {
        controlRef.current.remove();
        controlRef.current = null;
      }
      setContainer(null);
    };
  }, [map]);

  if (!container) return null;

  return createPortal(
    <ControlButtons
      position={position}
      onZoomIn={() => map.zoomIn()}
      onZoomOut={() => map.zoomOut()}
      onLocate={handleLocate}
      onOpenAmap={handleOpenInAmap}
    />,
    container,
  );
};

const MapCleanup = () => {
  const map = useMap();
  useEffect(() => {
    return () => {
      setTimeout(() => {
        if (map) {
          try {
            map.remove();
          } catch {}
        }
      }, 0);
    };
  }, [map]);
  return null;
};

interface LocationPickerProps {
  readonly?: boolean;
  latlng?: MapPoint;
  onChange?: (position: MapPoint) => void;
  className?: string;
}

const DEFAULT_CENTER: MapPoint = { lat: 39.9042, lng: 116.4074 };
const noopOnLocationChange = () => {};

const LocationPicker = ({ readonly: readOnly = false, latlng, onChange = noopOnLocationChange, className }: LocationPickerProps) => {
  const mapCenter = useMemo(() => toLatLng(latlng ?? DEFAULT_CENTER), [latlng?.lat, latlng?.lng]);
  const markerPosition = latlng ? toLatLng(latlng) : undefined;
  const statusLabel = readOnly ? "固定位置" : latlng ? "已选位置" : "选择位置";

  return (
    <div
      className={cn(
        "memo-location-map relative isolate h-72 w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm",
        className,
      )}
    >
      <MapContainer
        className="h-full w-full !bg-muted"
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <ThemedTileLayer />
        <LocationMarker position={markerPosition} readonly={readOnly} onChange={onChange} />
        <MapControls position={latlng} onLocationSelect={onChange} />
        <MapCleanup />
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[450] flex items-center gap-2">
        <div className="rounded-full border border-border bg-background/92 px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] text-foreground/80 shadow-sm backdrop-blur-sm">
          {statusLabel}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
