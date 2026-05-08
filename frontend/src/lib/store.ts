import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnalyzeResponse } from "@/services/api";

export type TeamTheme =
  | "apex" | "ferrari" | "redbull" | "mercedes" | "mclaren"
  | "alpine" | "astonmartin" | "williams" | "haas" | "rb" | "sauber";

interface MissionControlState {
  theme: TeamTheme;
  query: string;
  result: AnalyzeResponse | null;
  isLoading: boolean;
  
  // Actions
  setTheme: (theme: TeamTheme) => void;
  setQuery: (query: string) => void;
  setResult: (result: AnalyzeResponse | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMissionStore = create<MissionControlState>()(
  persist(
    (set) => ({
      theme: "apex",
      query: "",
      result: null,
      isLoading: false,

      setTheme: (theme) => set({ theme }),
      setQuery: (query) => set({ query }),
      setResult: (result) => set({ result }),
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "apex-mission-storage",
      partialize: (state) => ({ theme: state.theme }), // Chỉ lưu theme lại sau khi reload trang
    }
  )
);
