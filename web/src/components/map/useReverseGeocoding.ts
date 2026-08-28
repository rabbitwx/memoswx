import { useQuery } from "@tanstack/react-query";

// 将引号内替换为你的高德 Web服务 API Key
const AMAP_KEY = "6a2f975d720f0361ebdaa3e6da0c2d86";

export const useReverseGeocoding = (lat: number | undefined, lng: number | undefined) => {
  return useQuery({
    queryKey: ["geocoding", lat, lng],
    queryFn: async () => {
      const coordString = `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
      if (lat === undefined || lng === undefined) return "";

      try {
        // 高德逆地理编码接口，经纬度格式为：lng,lat
        const res = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=json&extensions=base`
        );
        const data = await res.json();
        
        if (data.status === "1" && data.regeocode?.formatted_address) {
          return data.regeocode.formatted_address as string;
        }
        return coordString;
      } catch (error) {
        console.error("高德逆地理编码请求失败:", error);
        return coordString;
      }
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: Infinity,
  });
};
