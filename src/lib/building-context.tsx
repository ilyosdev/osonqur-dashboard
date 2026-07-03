import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { smetasApi } from '@/lib/api/smetas';
import { useProject } from '@/lib/project-context';

interface Building {
  id: string;
  name: string;
}

interface BuildingContextType {
  buildings: Building[];
  selectedBuilding: Building | null;
  selectedBuildingId: string | null;
  isLoading: boolean;
  selectBuilding: (buildingId: string | null) => void;
}

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

const STORAGE_KEY = 'smetakon_selected_building';

export function BuildingProvider({ children }: { children: ReactNode }) {
  const { selectedProjectId } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBuildings = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await smetasApi.getProjectBuildings(projectId);
      setBuildings(data ?? []);

      const stored = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
      if (stored && data?.find(b => b.id === stored)) {
        setSelectedBuildingId(stored);
      } else {
        // Don't auto-select — user must choose
        setSelectedBuildingId(null);
      }
    } catch {
      setBuildings([]);
      setSelectedBuildingId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchBuildings(selectedProjectId);
    } else {
      setBuildings([]);
      setSelectedBuildingId(null);
    }
  }, [selectedProjectId, fetchBuildings]);

  const selectBuilding = useCallback((buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    if (buildingId && selectedProjectId) {
      localStorage.setItem(`${STORAGE_KEY}_${selectedProjectId}`, buildingId);
    } else if (selectedProjectId) {
      localStorage.removeItem(`${STORAGE_KEY}_${selectedProjectId}`);
    }
  }, [selectedProjectId]);

  const selectedBuilding = useMemo(
    () => buildings.find(b => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  const value = useMemo<BuildingContextType>(() => ({
    buildings,
    selectedBuilding,
    selectedBuildingId,
    isLoading,
    selectBuilding,
  }), [buildings, selectedBuilding, selectedBuildingId, isLoading, selectBuilding]);

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
}

export function useBuilding() {
  const context = useContext(BuildingContext);
  if (!context) throw new Error('useBuilding must be used within BuildingProvider');
  return context;
}
