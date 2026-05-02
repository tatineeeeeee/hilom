import { useBootstrapAuth } from "@/features/auth/hooks";
import { AppRoutes } from "@/app/routes";

export const App = () => {
  useBootstrapAuth();
  return <AppRoutes />;
};
