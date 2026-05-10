import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { cn } from "@/lib/utils";
import { RegisterPatientForm } from "../components/RegisterPatientForm";
import { RegisterDoctorForm } from "../components/RegisterDoctorForm";

type RoleTab = "patient" | "doctor";

interface RoleTabsProps {
  value: RoleTab;
  onChange: (next: RoleTab) => void;
}

const RoleTabs = ({ value, onChange }: RoleTabsProps) => {
  const tabs: { id: RoleTab; label: string }[] = [
    { id: "patient", label: "Patient" },
    { id: "doctor", label: "Doctor" },
  ];
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id ? "true" : "false"}
          onClick={() => onChange(t.id)}
          className={cn(
            "min-h-10 rounded text-sm font-medium transition",
            value === t.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export const RegisterPage = () => {
  const [tab, setTab] = useState<RoleTab>("patient");
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Hilom as a patient or doctor"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline">
            Log in
          </Link>
        </>
      }
    >
      <RoleTabs value={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === "patient" ? <RegisterPatientForm /> : <RegisterDoctorForm />}
      </div>
    </AuthLayout>
  );
};
