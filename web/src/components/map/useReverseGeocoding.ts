import { useQuery } from "@tanstack/react-query";

// 填入你的高德 Web服务 Key
const AMAP_KEY = "146dac968efd2ed50c05a3c3fa2c8cf6"; // 请确认填入完整的Key

export const useReverseGeocoding = (lat: number | undefined, lng: number | undefined) => {
  return useQuery({
    queryKey: ["geocoding", lat, lng],
    queryFn: async () => {
      const coordString = `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
      if (lat === undefined || lng === undefined) return "";

      try {
        if (AMAP_KEY) {
          // 高德逆地理编码
          const res = await fetch(
            `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=json&extensions=base`,
            { mode: "cors" }
          );
          const data = await res.json();
          
          if (data.status === "1" && data.regeocode && data.regeocode.formatted_address) {
            const addr = data.regeocode.formatted_address;
            if (typeof addr === "string" && addr.length > 0 && addr !== "[]") {
              return addr;
            }
          }
        }

        // 备用 OpenStreetMap 中文解析
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh-CN`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Memos/1.0",
            Accept: "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.display_name) return data.display_name as string;
        }

        return coordString;
      } catch (error) {
        console.error("Failed to fetch reverse geocoding data:", error);
        return coordString;
      }
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: Infinity,
  });
};
