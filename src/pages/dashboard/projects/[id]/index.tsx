import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Loader2,
  MessageCircle,
  LinkIcon,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Users,
  Plus,
  Upload,
  Building2,
  Banknote,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectsApi, Project } from "@/lib/api/projects";
import { telegramGroupsApi, TelegramGroup } from "@/lib/api/telegram-groups";
import { smetasApi, Smeta, SmetaType, CreateSmetaRequest } from "@/lib/api/smetas";
import { usersApi } from "@/lib/api/users";
import { uploadApi, ParsedSmetaItem } from "@/lib/api/upload";
import { ErrorMessage } from "@/components/ui/error-message";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ExcelUpload } from "@/components/dashboard/excel-upload";
import { useAuth } from "@/lib/auth";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "SmetakonBot";

const SMETA_TYPES: { value: SmetaType; label: string; description: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish", description: "Umumiy qurilish ishlari" },
  { value: "ELECTRICAL", label: "Elektr", description: "Elektr montaj ishlari" },
  { value: "PLUMBING", label: "Santexnika", description: "Santexnika ishlari" },
  { value: "HVAC", label: "HVAC", description: "Isitish, ventilyatsiya va konditsioner" },
  { value: "FINISHING", label: "Pardozlash", description: "Ichki pardozlash ishlari" },
  { value: "OTHER", label: "Boshqa", description: "Boshqa turdagi ishlar" },
];

const SMETA_TYPE_LABELS: Record<SmetaType, string> = {
  CONSTRUCTION: "Qurilish",
  ELECTRICAL: "Elektr",
  PLUMBING: "Santexnika",
  HVAC: "HVAC",
  FINISHING: "Pardozlash",
  OTHER: "Boshqa",
};

const SMETA_TYPE_COLORS: Record<SmetaType, string> = {
  CONSTRUCTION: "bg-blue-100 text-blue-700",
  ELECTRICAL: "bg-yellow-100 text-yellow-700",
  PLUMBING: "bg-cyan-100 text-cyan-700",
  HVAC: "bg-purple-100 text-purple-700",
  FINISHING: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ");
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("uz-UZ");
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [telegramGroup, setTelegramGroup] = useState<TelegramGroup | null>(null);
  const [smetas, setSmetas] = useState<Smeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSmetasLoading, setIsSmetasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [employeeCount, setEmployeeCount] = useState(0);

  // Create smeta dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [smetaForm, setSmetaForm] = useState({
    name: "",
    type: "CONSTRUCTION" as SmetaType,
    description: "",
    budget: 0,
    budgetDisplay: "",
    deadline: "",
    overheadPercent: 17.27,
  });

  // Excel upload state
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSmetaId, setSelectedSmetaId] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedSmetaItem[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const canUpload = ["DIREKTOR", "BOSS", "PTO", "OPERATOR"].includes(currentRole ?? user?.role ?? "");
  const canCreate = ["DIREKTOR", "PTO"].includes(currentRole ?? user?.role ?? "");

  const fetchSmetas = useCallback(async () => {
    if (!id) return;
    setIsSmetasLoading(true);
    try {
      const response = await smetasApi.getAll({ projectId: id, limit: 100 });
      setSmetas(response.data);
    } catch (err) {
      console.error("Error fetching smetas:", err);
    } finally {
      setIsSmetasLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const projectData = await projectsApi.getById(id);
        setProject(projectData);

        // Fetch telegram group for this project
        try {
          const groupsResponse = await telegramGroupsApi.getByProject(id);
          if (groupsResponse.data && groupsResponse.data.length > 0) {
            setTelegramGroup(groupsResponse.data[0]);
          }
        } catch {
          console.log("No telegram group found for project");
        }

        try {
          const usersResponse = await usersApi.countByProject(id);
          setEmployeeCount(usersResponse.count);
        } catch {
          // Project may have no assigned users
        }

        // Fetch smetas for this project
        await fetchSmetas();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, fetchSmetas]);

  const handleBudgetChange = (value: string) => {
    const numValue = parseNumber(value);
    setSmetaForm((prev) => ({
      ...prev,
      budget: numValue,
      budgetDisplay: formatNumberInput(numValue),
    }));
  };

  const handleCreateSmeta = async () => {
    if (!id) return;

    if (!smetaForm.name.trim()) {
      setCreateError("Smeta nomini kiriting");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const payload: CreateSmetaRequest = {
        projectId: id,
        name: smetaForm.name.trim(),
        type: smetaForm.type,
        description: smetaForm.description.trim() || undefined,
        budget: smetaForm.budget,
        deadline: smetaForm.deadline || undefined,
        overheadPercent: smetaForm.overheadPercent,
      };

      await smetasApi.create(payload);
      setCreateDialogOpen(false);
      setSmetaForm({
        name: "",
        type: "CONSTRUCTION",
        description: "",
        budget: 0,
        budgetDisplay: "",
        deadline: "",
        overheadPercent: 17.27,
      });
      await fetchSmetas();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Smeta yaratishda xatolik");
    } finally {
      setIsCreating(false);
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
    if (!selectedSmetaId || parsedItems.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const useDirectImport = parsedItems.length >= 1000 && uploadedFile;

      if (useDirectImport) {
        const result = await uploadApi.directImport(selectedSmetaId, uploadedFile, 'auto');
        if (result.errors.length > 0) {
          setImportError(`${result.skipped} ta xato: ${result.errors.slice(0, 5).join("; ")}`);
        }
        if (result.imported > 0) {
          await fetchSmetas();
          resetUploadState();
        }
      } else {
        const result = await uploadApi.importSmetaItems(selectedSmetaId, parsedItems);
        if (result.errors.length > 0) {
          setImportError(result.errors.join("; "));
        }
        if (result.imported > 0) {
          await fetchSmetas();
          resetUploadState();
        }
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import xatoligi");
    } finally {
      setIsImporting(false);
    }
  };

  const resetUploadState = () => {
    setParsedItems([]);
    setUploadedFile(null);
    setShowUpload(false);
    setSelectedSmetaId(null);
  };

  const getProgressPercent = (smeta: Smeta) => {
    if (smeta.budget === 0) return 0;
    return Math.min(100, Math.round((smeta.grandTotal / smeta.budget) * 100));
  };

  const isOverBudget = (smeta: Smeta) => {
    return smeta.grandTotal > smeta.budget && smeta.budget > 0;
  };

  const getTotalBudget = () => {
    return smetas.reduce((sum, s) => sum + s.budget, 0);
  };

  const getTotalSpent = () => {
    return smetas.reduce((sum, s) => sum + s.grandTotal, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" asChild>
          <Link to="/projects" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
        <ErrorMessage error={error || "Loyiha topilmadi"} />
      </div>
    );
  }

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/projects" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
      </div>

      {/* Project Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {project.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {project.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(project.createdAt).toLocaleDateString("uz-UZ")}
                </span>
                {telegramGroup ? (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageCircle className="h-4 w-4" />
                    {telegramGroup.title || "Telegram guruh"}
                  </span>
                ) : (
                  <TelegramLinkDialog botUsername={BOT_USERNAME} />
                )}
              </div>
              {project.description && (
                <p className="mt-3 text-muted-foreground">{project.description}</p>
              )}
            </div>
            <Badge className="bg-success/10 text-success self-start">Faol</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="h-4 w-4 mr-2" />
            Ma'lumotlar
          </TabsTrigger>
          <TabsTrigger value="smetas">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Smetalar ({smetas.length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Smetalar</p>
                    <p className="text-xl font-semibold">{smetas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Xodimlar</p>
                    <p className="text-xl font-semibold">{employeeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Banknote className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jami byudjet</p>
                    <p className="text-xl font-semibold">{formatNumber(getTotalBudget())} <span className="text-sm font-normal">so'm</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTotalSpent() > getTotalBudget() ? "bg-destructive/10" : "bg-orange-500/10"}`}>
                    <TrendingUp className={`h-5 w-5 ${getTotalSpent() > getTotalBudget() ? "text-destructive" : "text-orange-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sarflangan</p>
                    <p className={`text-xl font-semibold ${getTotalSpent() > getTotalBudget() ? "text-destructive" : ""}`}>
                      {formatNumber(getTotalSpent())} <span className="text-sm font-normal">so'm</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => { setActiveTab("smetas"); setCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Smeta qo'shish
            </Button>
          </div>
        </TabsContent>

        {/* Smetas Tab */}
        <TabsContent value="smetas" className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yangi smeta
                </Button>
              )}
              {canUpload && smetas.length > 0 && (
                <Button
                  variant={showUpload ? "secondary" : "outline"}
                  onClick={() => setShowUpload(!showUpload)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Excel yuklash
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={fetchSmetas} disabled={isSmetasLoading}>
              <RefreshCw className={`h-4 w-4 ${isSmetasLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Excel Upload Section */}
          {showUpload && canUpload && smetas.length > 0 && (
            <Card className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Smetani tanlang</Label>
                <Select value={selectedSmetaId || ""} onValueChange={setSelectedSmetaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Smeta tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {smetas.map((smeta) => (
                      <SelectItem key={smeta.id} value={smeta.id}>
                        {smeta.name} ({SMETA_TYPE_LABELS[smeta.type]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSmetaId && (
                <>
                  <ExcelUpload<ParsedSmetaItem>
                    title="Excel dan smeta elementlarini yuklash"
                    description="Smeta elementlarini o'z ichiga olgan Excel faylini yuklang"
                    onParsed={handleParsedItems}
                    parseFunction={uploadApi.parseSmetaItems}
                    supportsAi={true}
                  />

                  {parsedItems.length > 0 && (
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{parsedItems.length} ta element topildi</p>
                      </div>
                      <div className="max-h-40 overflow-auto space-y-2">
                        {parsedItems.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.quantity} {item.unit} x {formatNumber(item.unitPrice)}
                            </span>
                          </div>
                        ))}
                        {parsedItems.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center">
                            ... va yana {parsedItems.length - 5} ta element
                          </p>
                        )}
                      </div>

                      {importError && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <span>{importError}</span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetUploadState}>
                          Bekor qilish
                        </Button>
                        <Button onClick={handleImport} disabled={isImporting}>
                          {isImporting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Import qilinmoqda...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Import qilish ({parsedItems.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Smetas List */}
          {isSmetasLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : smetas.length === 0 ? (
            <Card className="p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Smetalar yo'q</h3>
              <p className="text-muted-foreground mb-4">
                Bu loyiha uchun hali smeta yaratilmagan
              </p>
              {canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Birinchi smetani yarating
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {smetas.map((smeta, index) => (
                <Link
                  key={smeta.id}
                  to={`/smetas/${smeta.id}`}
                  className="block"
                >
                  <Card
                    className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/50 animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{smeta.name}</h3>
                            <Badge className={SMETA_TYPE_COLORS[smeta.type]}>
                              {SMETA_TYPE_LABELS[smeta.type]}
                            </Badge>
                            {isOverBudget(smeta) && (
                              <Badge variant="destructive">Byudjetdan oshdi</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {smeta.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(smeta.deadline)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Yaratilgan: {formatDate(smeta.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Banknote className="h-3.5 w-3.5" />
                                Byudjet
                              </span>
                              <span className="font-medium">
                                {formatNumber(smeta.budget)} so'm
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Haqiqiy
                              </span>
                              <span className={`font-medium ${isOverBudget(smeta) ? "text-destructive" : ""}`}>
                                {formatNumber(smeta.grandTotal)} so'm
                              </span>
                            </div>
                          </div>

                          <div className="w-full sm:w-[150px] space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Bajarildi</span>
                              <span>{getProgressPercent(smeta)}%</span>
                            </div>
                            <ProgressBar
                              value={smeta.grandTotal}
                              max={smeta.budget || 1}
                              size="sm"
                              variant={isOverBudget(smeta) ? "destructive" : "default"}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Smeta Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Yangi smeta yaratish
            </DialogTitle>
            <DialogDescription>
              "{project.name}" loyihasiga yangi smeta qo'shing
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smetaName">Smeta nomi *</Label>
              <Input
                id="smetaName"
                placeholder="Masalan: Poydevor ishlari"
                value={smetaForm.name}
                onChange={(e) => setSmetaForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Smeta turi</Label>
              <Select
                value={smetaForm.type}
                onValueChange={(value) => setSmetaForm((prev) => ({ ...prev, type: value as SmetaType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smetaDescription">Tavsif</Label>
              <Textarea
                id="smetaDescription"
                placeholder="Smeta haqida qo'shimcha ma'lumot..."
                value={smetaForm.description}
                onChange={(e) => setSmetaForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smetaBudget">Byudjet</Label>
                <div className="relative">
                  <Input
                    id="smetaBudget"
                    placeholder="0"
                    value={smetaForm.budgetDisplay}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    so'm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smetaDeadline">Muddat</Label>
                <Input
                  id="smetaDeadline"
                  type="date"
                  value={smetaForm.deadline}
                  onChange={(e) => setSmetaForm((prev) => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreateSmeta} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Yaratish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TelegramLinkDialog({ botUsername }: { botUsername: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addToGroupLink = `https://t.me/${botUsername}?startgroup=true`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-warning hover:text-warning/80 transition-colors">
          <LinkIcon className="h-4 w-4" />
          Telegram guruhni ulash
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Telegram guruhni ulash
          </DialogTitle>
          <DialogDescription>
            Loyihani Telegram guruhi bilan bog'lash uchun quyidagi qadamlarni bajaring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">1</span>
              Botni guruhga qo'shing
            </div>
            <div className="ml-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Telegram guruhingizga @{botUsername} ni admin sifatida qo'shing
              </p>
              <div className="flex gap-2">
                <a
                  href={addToGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Guruhga qo'shish
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">2</span>
              /link buyrug'ini yuboring
            </div>
            <div className="ml-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Guruhda /link buyrug'ini yuboring va loyihani tanlang
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  /link
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("/link")}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">3</span>
              Loyihani tanlang
            </div>
            <div className="ml-8">
              <p className="text-sm text-muted-foreground">
                Bot sizga loyihalar ro'yxatini ko'rsatadi. Shu loyihani tanlang va guruh ulanadi.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Eslatma: Faqat DIREKTOR va BOSS rollari guruhni loyihaga ulash imkoniyatiga ega.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
