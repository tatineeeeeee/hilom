interface Props {
  variant: "patient" | "doctor";
  fullName: string;
}

const timeOfDay = (): "morning" | "afternoon" | "evening" => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
};

const firstName = (name: string): string => name.split(/\s+/)[0] ?? name;
const lastName = (name: string): string => {
  const parts = name.split(/\s+/);
  return parts[parts.length - 1] ?? name;
};

export const GreetingHeader = ({ variant, fullName }: Props) => {
  const tod = timeOfDay();
  const name =
    variant === "doctor" ? `Dr. ${lastName(fullName)}` : firstName(fullName);

  const dateStr = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Good {tod}, {name}
      </h1>
      <p className="text-sm text-muted-foreground">{dateStr}</p>
    </div>
  );
};
