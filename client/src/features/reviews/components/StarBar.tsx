interface StarBarProps {
  value: number;
  size?: "sm" | "md";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
} as const;

export const StarBar = ({ value, size = "sm" }: StarBarProps) => {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={`inline-flex gap-0.5 ${sizeMap[size]}`}
      aria-label={`${clamped} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={
            n <= clamped ? "text-amber-400" : "text-muted-foreground/30"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
};
