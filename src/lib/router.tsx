import { useState, useEffect, createContext, useContext } from 'react';

export type AppRoute = '/' | '/project-details' | '/supervisor-reports' | '/import-records';

interface RouterContextType {
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentRoute: '/',
  navigate: () => {},
});

function getCleanPath(): AppRoute {
  if (typeof window === 'undefined') return '/';
  
  // Check pathname first
  let pathname = window.location.pathname;
  if (pathname === '/project-details' || pathname.endsWith('/project-details')) return '/project-details';
  if (pathname === '/supervisor-reports' || pathname.endsWith('/supervisor-reports')) return '/supervisor-reports';
  if (pathname === '/import-records' || pathname.endsWith('/import-records')) return '/import-records';
  
  // Also check hash for iframe / preview support
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'project-details' || hash === '/project-details') return '/project-details';
  if (hash === 'supervisor-reports' || hash === '/supervisor-reports') return '/supervisor-reports';
  if (hash === 'import-records' || hash === '/import-records') return '/import-records';

  return '/';
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getCleanPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getCleanPath());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (route: AppRoute) => {
    if (route === currentRoute) return;
    try {
      window.history.pushState(null, '', route);
    } catch {
      // Fallback for sandboxed iframes
      window.location.hash = route.replace(/^\//, '');
    }
    setCurrentRoute(route);
  };

  return (
    <RouterContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
