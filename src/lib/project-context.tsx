import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { projectsApi, Project } from '@/lib/api/projects';
import { useAuth } from '@/lib/auth';

interface ProjectContextType {
  projects: Project[];
  selectedProject: Project | null;
  selectedProjectId: string | null;
  isLoading: boolean;
  selectProject: (projectId: string | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'smetakon_selected_project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const result = await projectsApi.getAll({ limit: 100 });
      setProjects(result.data);

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && result.data.find(p => p.id === stored)) {
        // Stored project still exists — keep it
        setSelectedProjectId(stored);
      } else if (stored) {
        // Stored project no longer exists — clear and pick first
        localStorage.removeItem(STORAGE_KEY);
        if (result.data.length > 0) {
          setSelectedProjectId(result.data[0].id);
          localStorage.setItem(STORAGE_KEY, result.data[0].id);
        } else {
          setSelectedProjectId(null);
        }
      } else if (!stored && result.data.length > 0) {
        // Nothing stored — auto-select first project
        setSelectedProjectId(result.data[0].id);
        localStorage.setItem(STORAGE_KEY, result.data[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Clear project when user changes (different org)
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setSelectedProjectId(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user?.id]);

  const selectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      localStorage.setItem(STORAGE_KEY, projectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const value = useMemo<ProjectContextType>(() => ({
    projects,
    selectedProject,
    selectedProjectId,
    isLoading,
    selectProject,
    refreshProjects: fetchProjects,
  }), [projects, selectedProject, selectedProjectId, isLoading, selectProject, fetchProjects]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}
