import { DivIcon } from "leaflet";
import { MapPinIcon } from "lucide-react";
import { useMemo } from "react";
import ReactDOMServer from "react-dom/server";
import { TileLayer } from "react-leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { resolveTheme } from "@/utils/theme";

// 替换为高德地图瓦片服务（支持深浅色样式）
const TILE_URLS = {
  // style=7 为标准矢量底图（浅色），style=8 为含更多路网的中文底图
  light: "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
  dark: "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
} as const;

export const ThemedTileLayer = () => {
  const { userGeneralSetting } = useAuth();
  const isDark = useMemo(() => resolveTheme(userGeneralSetting?.theme || "system").includes("dark"), [userGeneralSetting?.theme]);

  return (
    <TileLayer
      url={isDark ? TILE_URLS.dark : TILE_URLS.light}
      subdomains={["1", "2", "3", "4"]}
      maxZoom={18}
      minZoom={3}
      attribution='&copy; <a href="https://lbs.amap.com/">高德地图</a>'
    />
  );
};

interface MarkerIconOptions {
  fill?: string;
  size?: number;
  className?: string;
}

export const createMarkerIcon = (options?: MarkerIconOptions): DivIcon => {
  const { fill = "var(--primary)", size = 28, className = "" } = options || {};
  return new DivIcon({
    className: "relative border-none bg-transparent",
    html: ReactDOMServer.renderToString(
      <div className={`relative flex items-center justify-center ${className}`.trim()}>
        <MapPinIcon fill={fill} size={size} strokeWidth={1.9} style={{ filter: "drop-shadow(0 6px 10px rgba(15, 23, 42, 0.22))" }} />
      </div>,
    ),
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, size + 4],
    popupAnchor: [0, -(size * 0.7)],
  });
};

export const defaultMarkerIcon = createMarkerIcon();
