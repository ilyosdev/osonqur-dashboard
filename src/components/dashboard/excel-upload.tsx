import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface ExcelUploadProps<T> {
  title: string;
  description?: string;
  onParsed: (data: T[], warnings: string[]) => void;
  parseFunction: (file: File, useAi?: boolean) => Promise<{
    success: boolean;
    data: T[];
    errors: string[];
    warnings: string[];
  }>;
  supportsAi?: boolean;
}

export function ExcelUpload<T>({
  title,
  description,
  onParsed,
  parseFunction,
  supportsAi = true,
}: ExcelUploadProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAi, setUseAi] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i);

    if (!isValidType) {
      setError("Faqat Excel fayllar (.xlsx, .xls) yoki CSV qabul qilinadi");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setParsedCount(null);

    try {
      const result = await parseFunction(file, supportsAi && useAi);

      if (result.errors.length > 0) {
        setError(result.errors.join("; "));
      }

      if (result.data.length > 0) {
        setParsedCount(result.data.length);
        onParsed(result.data, result.warnings);
      } else {
        setError("Faylda ma'lumot topilmadi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Faylni o'qishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const reset = () => {
    setFileName(null);
    setParsedCount(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {supportsAi && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="ai-mode" className="text-sm cursor-pointer">
                AI yordamida o'qish
              </Label>
            </div>
            <Switch
              id="ai-mode"
              checked={useAi}
              onCheckedChange={setUseAi}
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
        />

        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${isLoading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {useAi ? "AI yordamida tahlil qilinmoqda..." : "O'qilmoqda..."}
              </p>
            </div>
          ) : parsedCount !== null ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-10 w-10 text-success" />
              <div className="text-center">
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedCount} ta element topildi
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); reset(); }}>
                <X className="h-4 w-4 mr-1" />
                Tozalash
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Faylni shu yerga tashlang</p>
                <p className="text-sm text-muted-foreground">
                  yoki bosing va tanlang
                </p>
              </div>
              <Badge variant="outline">.xlsx, .xls, .csv</Badge>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
