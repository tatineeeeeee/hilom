import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const QueryErrorState = ({
  message = "Couldn't load.",
  onRetry,
}: QueryErrorStateProps) => (
  <div className="flex items-center gap-2 py-2">
    <p className="text-sm text-destructive">{message}</p>
    <Button size="xs" variant="outline" onClick={onRetry}>
      Retry
    </Button>
  </div>
);
