import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { ScheduleEditor } from "../components/ScheduleEditor";

export const SchedulePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (user.role !== "doctor") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Only doctors can manage schedules.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate("/dashboard")}
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Weekly schedule
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Set your available hours for each day of the week.
      </p>
      <ScheduleEditor />
    </div>
  );
};
