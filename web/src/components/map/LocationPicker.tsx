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

const LocationMarker = ({ position, onChange, readonly: readOnly }: LocationMarkerProps) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (readOnly) return;
      onChange(fromLatLng(e.latlng));
    },
  });

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom() > 12 ? map.getZoom() : 14);
    }
  }, [position, map]);

  return position ? <Marker position={position} icon={defaultMarkerIcon} /> : null;
};

interface GlassButtonProps {
  icon: ReactNode;
  onClick: (e: React.MouseEvent) => void;
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
        "border border-border/80 bg-background/88 text-foreground shadow-sm backdrop-blur-md cursor-pointer",
        "hover:scale-105 hover:bg-background hover:shadow-md active:scale-95",
      )}
    >
      {icon}
    </button>
  );
};

interface ControlButtonsProps {
  position: MapPoint | undefined;
  onZoomIn: (e: React.MouseEvent) => void;
  onZoomOut: (e: React.MouseEvent) => void;
  onLocate: (e: React.MouseEvent) => void;
  onOpenAmap: (e: React.MouseEvent) => void;
}

const ControlButtons = ({ position, onZoomIn, onZoomOut, onLocate, onOpenAmap }: ControlButtonsProps) => {
  return (
    <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
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
  onLocationSelect: (position: MapPoint) => void;
}

const MapControls = ({ position, onLocationSelect }: MapControlsProps) => {
  const map = useMap();
  const controlRef = useRef<MapControlsContainer | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const handleOpenInAmap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!position) return;
    const url = `https://uri.amap.com/marker?position=${position.lng},${position.lat}&name=选定位置`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleLocate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const doAmapIpLocate = async () => {
      try {
        const res = await fetch(`https://restapi.amap.com/v3/ip?key=${AMAP_KEY}`);
        const data = await res.json();

        if (data.status === "1") {
          let targetLng: number | null = null;
          let targetLat: number | null = null;

          // 1. 如果返回了矩形边界范围
          if (typeof data.rectangle === "string" && data.rectangle.length > 0) {
            const parts = data.rectangle.split(";")[0].split(",");
            targetLng = parseFloat(parts[0]);
            targetLat = parseFloat(parts[1]);
          } 
          // 2. 如果 rectangle 为空，则根据城市名称进行地理编码解析
          else if (data.city && typeof data.city === "string" && data.city !== "[]") {
            const geoRes = await fetch(
              `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(data.city)}`
            );
            const geoData = await geoRes.json();
            if (geoData.status === "1" && geoData.geocodes?.length > 0) {
              const loc = geoData.geocodes[0].location.split(",");
              targetLng = parseFloat(loc[0]);
              targetLat = parseFloat(loc[1]);
            }
          }

          if (targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng)) {
            const pt = { lat: targetLat, lng: targetLng };
            map.setView(new LatLng(pt.lat, pt.lng), 14);
            onLocationSelect(pt);
            return true;
          }
        }
      } catch (err) {
        console.error("IP 定位解析失败:", err);
      }
      return false;
    };

    if (window.isSecureContext && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.setView(new LatLng(pt.lat, pt.lng), 16);
          onLocationSelect(pt);
        },
        async () => {
          await doAmapIpLocate();
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      await doAmapIpLocate();
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
      onZoomIn={(e) => { e.stopPropagation(); map.zoomIn(); }}
      onZoomOut={(e) => { e.stopPropagation(); map.zoomOut(); }}
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

const LocationPicker = ({
  readonly: readOnly = false,
  latlng,
  onChange = () => {},
  className,
}: LocationPickerProps) => {
  const [internalPoint, setInternalPoint] = useState<MapPoint | undefined>(latlng);

  useEffect(() => {
    setInternalPoint(latlng);
  }, [latlng]);

  const handleSelect = (pt: MapPoint) => {
    setInternalPoint(pt);
    onChange(pt);
  };

  const mapCenter = useMemo(() => toLatLng(internalPoint ?? DEFAULT_CENTER), [internalPoint?.lat, internalPoint?.lng]);
  const markerPosition = useMemo(() => (internalPoint ? toLatLng(internalPoint) : undefined), [internalPoint]);
  const statusLabel = readOnly ? "固定位置" : internalPoint ? "已选位置" : "选择位置";

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
        <LocationMarker position={markerPosition} readonly={readOnly} onChange={handleSelect} />
        <MapControls position={internalPoint} onLocationSelect={handleSelect} />
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
