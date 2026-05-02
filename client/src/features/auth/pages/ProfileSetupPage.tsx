import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../hooks";

export const ProfileSetupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Welcome, {user?.fullName}. Profile completion lands in Phase 3 —
            doctors will fill in bio, schedule, and clinic details; patients
            will add date of birth, blood type, allergies, and emergency
            contact.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Continue to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
