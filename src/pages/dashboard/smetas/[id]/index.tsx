import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Calendar,
  Loader2,
  Package,
  Banknote,
  TrendingUp,
  Plus,
  Edit2,
  Check,
  X,
  Building2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { smetasApi, Smeta, SmetaType } from "@/lib/api/smetas";
import { smetaItemsApi, SmetaItem, SmetaItemType } from "@/lib/api/smeta-items";
import { uploadApi, ParsedSmetaItem } from "@/lib/api/upload";
import { ErrorMessage } from "@/components/ui/error-message";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ExcelUpload } from "@/components/dashboard/excel-upload";
import { useAuth } from "@/lib/auth";

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ");
}

const ITEM_TYPE_LABELS: Record<SmetaItemType, string> = {
  WORK: "Ish",
  MACHINE: "Texnika",
  MATERIAL: "Material",
  OTHER: "Boshqa",
};

const ITEM_TYPE_COLORS: Record<SmetaItemType, string> = {
  WORK: "bg-blue-100 text-blue-700",
  MACHINE: "bg-purple-100 text-purple-700",
  MATERIAL: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const SMETA_TYPE_LABELS: Record<SmetaType, string> = {
  CONSTRUCTION: "Qurilish",
  ELECTRICAL: "Elektr",
  PLUMBING: "Santexnika",
  HVAC: "HVAC",
  FINISHING: "Pardozlash",
  OTHER: "Boshqa",
};

export default function SmetaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user } = useAuth();
  const [smeta, setSmeta] = useState<Smeta | null>(null);
  const [items, setItems] = useState<SmetaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Excel upload state
  const [showUpload, setShowUpload] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedSmetaItem[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const canEditProgress = ["PRORAB", "DIREKTOR", "BOSS"].includes(currentRole ?? user?.role ?? "");
  const canUpload = ["DIREKTOR", "BOSS", "PTO", "OPERATOR"].includes(currentRole ?? user?.role ?? "");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [smetaData, itemsData] = await Promise.all([
        smetasApi.getById(id),
        smetaItemsApi.getAll({ smetaId: id, limit: 5000 }),
      ]);
      setSmeta(smetaData);
      setItems(itemsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEditing = (item: SmetaItem) => {
    setEditingItemId(item.id);
    setEditValue(item.usedQuantity.toString());
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditValue("");
  };

  const saveProgress = async (item: SmetaItem) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      return;
    }

    setIsSaving(true);
    try {
      await smetaItemsApi.update(item.id, {
        usedQuantity: newValue,
        usedAmount: newValue * item.unitPrice,
      });

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, usedQuantity: newValue, usedAmount: newValue * item.unitPrice }
            : i
        )
      );
      setEditingItemId(null);
      setEditValue("");
    } catch (err) {
      console.error("Error saving progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleParsedItems = (data: ParsedSmetaItem[], warnings: string[], file?: File) => {
    setParsedItems(data);
    if (file) setUploadedFile(file);
    if (warnings.length > 0) {
      console.log("Excel parsing warnings:", warnings);
    }
  };

  const handleImport = async () => {
    if (!id || parsedItems.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    setImportProgress(null);

    try {
      // Use direct import for large files (1000+ items) to avoid JSON size limits
      const useDirectImport = parsedItems.length >= 1000 && uploadedFile;

      if (useDirectImport) {
        setImportProgress(`To'g'ridan-to'g'ri import qilinmoqda (${parsedItems.length} ta element)...`);
        const result = await uploadApi.directImport(id, uploadedFile, 'auto');

        if (result.errors.length > 0) {
          setImportError(`${result.skipped} ta xato: ${result.errors.slice(0, 5).join("; ")}${result.errors.length > 5 ? "..." : ""}`);
        }

        if (result.imported > 0) {
          await fetchData();
          setParsedItems([]);
          setUploadedFile(null);
          setShowUpload(false);
        }
      } else {
        // Standard import for smaller files
        setImportProgress(`Import qilinmoqda (${parsedItems.length} ta element)...`);
        const result = await uploadApi.importSmetaItems(id, parsedItems);

        if (result.errors.length > 0) {
          setImportError(result.errors.join("; "));
        }

        if (result.imported > 0) {
          await fetchData();
          setParsedItems([]);
          setUploadedFile(null);
          setShowUpload(false);
        }
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import xatoligi");
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const getTotalUsed = () => {
    return items.reduce((sum, item) => sum + item.usedAmount, 0);
  };

  const getOverallProgress = () => {
    if (!smeta || smeta.budget === 0) return 0;
    return Math.min(100, Math.round((getTotalUsed() / smeta.budget) * 100));
  };

  const isOverBudget = () => {
    return smeta && smeta.budget > 0 && getTotalUsed() > smeta.budget;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !smeta) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" asChild>
          <Link to="/smetas" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
        <ErrorMessage error={error || "Smeta topilmadi"} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/smetas" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Smeta</span>
                <Badge variant="outline">{SMETA_TYPE_LABELS[smeta.type]}</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{smeta.name}</h1>
              {smeta.description && (
                <p className="text-muted-foreground">{smeta.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {smeta.projectName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {smeta.projectName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Yaratilgan: {formatDate(smeta.createdAt)}
                </span>
                {smeta.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Muddat: {formatDate(smeta.deadline)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {items.length} ta element
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Yuklab olish
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejalashtirilgan byudjet</p>
                <p className="text-xl font-bold">{formatNumber(smeta.budget)} so'm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOverBudget() ? "bg-destructive/10" : "bg-success/10"}`}>
                <TrendingUp className={`h-5 w-5 ${isOverBudget() ? "text-destructive" : "text-success"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Haqiqiy sarflangan</p>
                <p className={`text-xl font-bold ${isOverBudget() ? "text-destructive" : ""}`}>
                  {formatNumber(getTotalUsed())} so'm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Umumiy bajarilish</span>
                <span className="font-medium">{getOverallProgress()}%</span>
              </div>
              <ProgressBar
                value={getTotalUsed()}
                max={smeta.budget || 1}
                size="md"
                variant={isOverBudget() ? "destructive" : "default"}
              />
              {isOverBudget() && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Byudjetdan {formatNumber(getTotalUsed() - smeta.budget)} so'm oshdi
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel Upload Section */}
      {showUpload && canUpload && (
        <div className="space-y-4">
          <ExcelUpload<ParsedSmetaItem>
            title="Excel dan smeta elementlarini yuklash"
            description="Smeta elementlarini o'z ichiga olgan Excel faylini yuklang"
            onParsed={handleParsedItems}
            parseFunction={uploadApi.parseSmetaItems}
            supportsAi={true}
          />

          {parsedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {parsedItems.length} ta element topildi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-60 overflow-auto space-y-2">
                  {parsedItems.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} {item.unit} x {formatNumber(item.unitPrice)} = {formatNumber(item.totalAmount)}
                      </span>
                    </div>
                  ))}
                  {parsedItems.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... va yana {parsedItems.length - 10} ta element
                    </p>
                  )}
                </div>

                {importError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                {parsedItems.length >= 1000 && uploadedFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>Katta fayl aniqlandi. To'g'ridan-to'g'ri import ishlatiladi.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setParsedItems([]); setUploadedFile(null); setShowUpload(false); }}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {importProgress || "Import qilinmoqda..."}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Import qilish ({parsedItems.length})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Items List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Smeta elementlari
          </CardTitle>
          <div className="flex gap-2">
            {canUpload && (
              <Button
                variant={showUpload ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Excel yuklash
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/smetas/${id}/add-item`)}>
              <Plus className="h-4 w-4 mr-2" />
              Element qo'shish
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Bu smetada hali elementlar yo'q
              </p>
              <Button onClick={() => navigate(`/smetas/${id}/add-item`)}>
                <Plus className="h-4 w-4 mr-2" />
                Birinchi elementni qo'shing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isEditing = editingItemId === item.id;
                const progress = item.quantity > 0
                  ? Math.min(100, Math.round((item.usedQuantity / item.quantity) * 100))
                  : 0;
                const isItemOverBudget = item.usedQuantity > item.quantity;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge className={ITEM_TYPE_COLORS[item.itemType]}>
                            {ITEM_TYPE_LABELS[item.itemType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.code || item.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatNumber(item.totalAmount)} so'm
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(item.quantity)} {item.unit} x {formatNumber(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Ishlatilgan</span>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 h-8 text-sm"
                                autoFocus
                              />
                              <span className="text-muted-foreground">/ {formatNumber(item.quantity)} {item.unit}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => saveProgress(item)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-success" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className={isItemOverBudget ? "text-destructive" : ""}>
                                {formatNumber(item.usedQuantity)} / {formatNumber(item.quantity)} {item.unit}
                              </span>
                              {canEditProgress && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => startEditing(item)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <ProgressBar
                        value={item.usedQuantity}
                        max={item.quantity || 1}
                        size="sm"
                        variant={isItemOverBudget ? "destructive" : "default"}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sarflangan: {formatNumber(item.usedAmount)} so'm</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
