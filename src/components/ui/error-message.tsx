
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translateError } from "@/lib/error-messages";

interface ErrorMessageProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorMessage({
  error,
  onRetry,
  title = "Xatolik yuz berdi",
}: ErrorMessageProps) {
  const message = translateError(error);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Qayta urinish
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
