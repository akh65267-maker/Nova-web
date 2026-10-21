import { useQuery } from "@tanstack/react-query";
import { listBrands } from "./catalog-api";

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: listBrands,
    staleTime: 5 * 60_000,
  });
}
