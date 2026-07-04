import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  FolderOpen, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, FileSpreadsheet, Users, Calendar, Upload, Building2, UserPlus,
  MapPin, Phone, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { adminApi, AdminOrgProject, AdminProjectSmeta, AdminProjectUser, AdminSmetaType, AdminOrgUser, AdminBuilding, AdminOrgRole } from "@/lib/api/admin";
import { TablePagination } from "@/components/shared/table-pagination";
import { smetaItemsApi, CreateSmetaItemRequest } from "@/lib/api/smeta-items";

interface ExcelRow { name: string; unit: string; quantity: number; unitPrice: number }

const SMETA_TYPES: { value: AdminSmetaType; label: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish" },
  { value: "ELECTRICAL", label: "Elektr" },
  { value: "PLUMBING", label: "Santexnika" },
  { value: "HVAC", label: "Isitish/Sovutish" },
  { value: "FINISHING", label: "Pardozlash" },
  { value: "OTHER", label: "Boshqa" },
];

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<AdminOrgProject | null>(null);
  const [smetas, setSmetas] = useState<AdminProjectSmeta[]>([]);
  const [users, setUsers] = useState<AdminProjectUser[]>([]);
  const [smetaTotal, setSmetaTotal] = useState(0);
  const [smetaPage, setSmetaPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Smeta dialogs
  const [addSmetaDialogOpen, setAddSmetaDialogOpen] = useState(false);
  const [editSmetaDialogOpen, setEditSmetaDialogOpen] = useState(false);
  const [deleteSmetaDialogOpen, setDeleteSmetaDialogOpen] = useState(false);
  const [selectedSmeta, setSelectedSmeta] = useState<AdminProjectSmeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Pagination
  const PAGE_SIZE = 10;
  const [buildingPage, setBuildingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  // User assignment state
  const [userSearch, setUserSearch] = useState("");
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [allOrgUsers, setAllOrgUsers] = useState<AdminOrgUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserOrgRoleId, setSelectedUserOrgRoleId] = useState("");
  const [orgRoles, setOrgRoles] = useState<AdminOrgRole[]>([]);

  // Buildings state
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [addBuildingDialogOpen, setAddBuildingDialogOpen] = useState(false);
  const [editBuildingDialogOpen, setEditBuildingDialogOpen] = useState(false);
  const [deleteBuildingDialogOpen, setDeleteBuildingDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<AdminBuilding | null>(null);
  const [buildingFormData, setBuildingFormData] = useState({ name: "", budget: "", startDate: "", endDate: "" });
  const [buildingFormError, setBuildingFormError] = useState("");

  // Excel upload state
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [excelSmetaId, setExcelSmetaId] = useState<string>("");
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelError, setExcelError] = useState("");
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [smetaFormData, setSmetaFormData] = useState({
    name: "",
    type: "CONSTRUCTION" as AdminSmetaType,
    description: "",
    budget: "",
    deadline: "",
    overheadPercent: "17.27",
  });

  const fetchProject = useCallback(async () => {
    if (!orgId || !projectId) return;
    // Get project from the projects list (we don't have a single project endpoint)
    try {
      const result = await adminApi.getOrgProjects(orgId, { page: 1, limit: 100 });
      const proj = result.data.find((p) => p.id === projectId);
      if (proj) setProject(proj);
    } catch {}
  }, [orgId, projectId]);

  const fetchSmetas = useCallback(async () => {
    if (!orgId || !projectId) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getProjectSmetas(orgId, projectId, {
        page: smetaPage,
        limit: 20,
        search: searchQuery || undefined,
      });
      setSmetas(result.data);
      setSmetaTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, projectId, smetaPage, searchQuery]);

  const fetchBuildings = useCallback(async () => {
    if (!orgId || !projectId) return;
    try {
      const result = await adminApi.getProjectBuildings(orgId, projectId);
      setBuildings(result);
    } catch {}
  }, [orgId, projectId]);

  const fetchUsers = useCallback(async () => {
    if (!orgId || !projectId) return;
    try {
      const result = await adminApi.getProjectUsers(orgId, projectId);
      setUsers(result);
    } catch {}
  }, [orgId, projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);
  useEffect(() => { fetchSmetas(); }, [fetchSmetas]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  const resetSmetaForm = () => {
    setSmetaFormData({
      name: "",
      type: "CONSTRUCTION",
      description: "",
      budget: "",
      deadline: "",
      overheadPercent: "17.27",
    });
    setFormError("");
  };

  const openAddSmetaDialog = () => {
    resetSmetaForm();
    setAddSmetaDialogOpen(true);
  };

  const openEditSmetaDialog = (smeta: AdminProjectSmeta) => {
    setSelectedSmeta(smeta);
    setSmetaFormData({
      name: smeta.name,
      type: smeta.type,
      description: smeta.description || "",
      budget: smeta.budget?.toString() || "",
      deadline: smeta.deadline ? smeta.deadline.split("T")[0] : "",
      overheadPercent: smeta.overheadPercent?.toString() || "17.27",
    });
    setFormError("");
    setEditSmetaDialogOpen(true);
  };

  const openDeleteSmetaDialog = (smeta: AdminProjectSmeta) => {
    setSelectedSmeta(smeta);
    setDeleteSmetaDialogOpen(true);
  };

  const handleAddSmeta = async () => {
    if (!orgId || !projectId || !smetaFormData.name.trim()) {
      setFormError("Smeta nomi kiritilishi kerak");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createProjectSmeta(orgId, projectId, {
        name: smetaFormData.name,
        type: smetaFormData.type,
        description: smetaFormData.description || undefined,
        budget: smetaFormData.budget ? parseFloat(smetaFormData.budget) : undefined,
        deadline: smetaFormData.deadline || undefined,
        overheadPercent: smetaFormData.overheadPercent ? parseFloat(smetaFormData.overheadPercent) : undefined,
      });
      setAddSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSmeta = async () => {
    if (!orgId || !projectId || !selectedSmeta) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updateProjectSmeta(orgId, projectId, selectedSmeta.id, {
        name: smetaFormData.name || undefined,
        type: smetaFormData.type,
        description: smetaFormData.description || undefined,
        budget: smetaFormData.budget ? parseFloat(smetaFormData.budget) : undefined,
        deadline: smetaFormData.deadline || undefined,
        overheadPercent: smetaFormData.overheadPercent ? parseFloat(smetaFormData.overheadPercent) : undefined,
      });
      setEditSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSmeta = async () => {
    if (!orgId || !projectId || !selectedSmeta) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteProjectSmeta(orgId, projectId, selectedSmeta.id);
      setDeleteSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      setDeleteSmetaDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignUserDialog = async () => {
    setAssignUserDialogOpen(true);
    setSelectedUserId("");
    setSelectedUserOrgRoleId("");
    if (!orgId) return;
    try {
      const [usersResult, rolesResult] = await Promise.all([
        adminApi.getOrgUsers(orgId, { limit: 100 }),
        adminApi.getOrgRoles(orgId),
      ]);
      setAllOrgUsers(usersResult.data);
      setOrgRoles(rolesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xodimlarni yuklashda xatolik");
    }
  };

  const handleAssignUser = async () => {
    if (!orgId || !projectId || !selectedUserId) return;
    try {
      await adminApi.assignUserToProject(orgId, selectedUserId, projectId, selectedUserOrgRoleId || undefined);
      setSelectedUserId("");
      setSelectedUserOrgRoleId("");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tayinlashda xatolik");
    }
  };

  const handleUnassignUser = async (userId: string) => {
    if (!orgId || !projectId) return;
    try {
      await adminApi.unassignUserFromProject(orgId, userId, projectId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bekor qilishda xatolik");
    }
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString("uz-UZ") + " so'm";
  };

  const getSmetaTypeLabel = (type: string) => {
    return SMETA_TYPES.find((t) => t.value === type)?.label || type;
  };

  const smetaTotalPages = Math.ceil(smetaTotal / 20);

  const filteredUsers = users.filter((u) => !userSearch.trim() || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch));
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);

  const buildingTotalPages = Math.max(1, Math.ceil(buildings.length / PAGE_SIZE));
  const pagedBuildings = buildings.slice((buildingPage - 1) * PAGE_SIZE, buildingPage * PAGE_SIZE);

  const handleAddBuilding = async () => {
    if (!orgId || !projectId || !buildingFormData.name.trim()) {
      setBuildingFormError("Bino nomi kiritilishi kerak");
      return;
    }
    setIsSubmitting(true);
    setBuildingFormError("");
    try {
      await adminApi.createProjectBuilding(orgId, projectId, {
        name: buildingFormData.name,
        budget: buildingFormData.budget ? parseFloat(buildingFormData.budget) : undefined,
        startDate: buildingFormData.startDate || undefined,
        endDate: buildingFormData.endDate || undefined,
      });
      setAddBuildingDialogOpen(false);
      fetchBuildings();
    } catch (err) {
      setBuildingFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBuilding = async () => {
    if (!orgId || !projectId || !selectedBuilding) return;
    setIsSubmitting(true);
    setBuildingFormError("");
    try {
      await adminApi.updateProjectBuilding(orgId, projectId, selectedBuilding.id, {
        name: buildingFormData.name || undefined,
        budget: buildingFormData.budget ? parseFloat(buildingFormData.budget) : undefined,
        startDate: buildingFormData.startDate || undefined,
        endDate: buildingFormData.endDate || undefined,
      });
      setEditBuildingDialogOpen(false);
      fetchBuildings();
    } catch (err) {
      setBuildingFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!orgId || !projectId || !selectedBuilding) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteProjectBuilding(orgId, projectId, selectedBuilding.id);
      setDeleteBuildingDialogOpen(false);
      fetchBuildings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      setDeleteBuildingDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openExcelDialog = (smetaId: string) => {
    setExcelSmetaId(smetaId);
    setExcelRows([]);
    setExcelError("");
    setExcelFileName("");
    setExcelDialogOpen(true);
  };

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        const parsed: ExcelRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const name = String(row[0] || "").trim().slice(0, 500);
          const unit = String(row[1] || "dona").trim().slice(0, 50);
          const quantity = parseFloat(String(row[2] || "0").replace(",", ".")) || 0;
          const unitPrice = parseFloat(String(row[3] || "0").replace(",", ".")) || 0;
          if (name) parsed.push({ name, unit, quantity, unitPrice });
        }

        if (parsed.length === 0) {
          setExcelError("Excel faylda ma'lumot topilmadi. Format: Nomi | Birligi | Miqdori | Narxi");
          return;
        }
        setExcelRows(parsed);
      } catch {
        setExcelError("Excel faylni o'qishda xatolik");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelUpload = async () => {
    if (!excelSmetaId || excelRows.length === 0) return;
    setExcelUploading(true);
    setExcelError("");
    try {
      const items: CreateSmetaItemRequest[] = excelRows.map((row) => ({
        smetaId: excelSmetaId,
        name: row.name,
        unit: row.unit,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        category: "Umumiy",
      }));
      await smetaItemsApi.bulkCreate(items);
      setExcelDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : "Yuklashda xatolik");
    } finally {
      setExcelUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-[10px] bg-white border border-[#dbe7f3] shadow-none hover:bg-[#f0f7ff] h-9 w-9">
          <Link to={`/admin/organizations/${orgId}/projects`}><ArrowLeft className="h-4 w-4 text-[#185fa5]" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold text-[#0c447c] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#378add]" />
            {project?.name || "..."}
          </h1>
          <p className="text-[13px] text-[#64748b]">Loyiha ma'lumotlari va smetalar</p>
        </div>
      </div>

      {project && (
        <div className="rounded-[14px] border border-[#dbe7f3] bg-white px-6 py-5 shadow-none">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8] mb-1">
                <MapPin className="h-3 w-3" /> Manzil
              </div>
              <p className="text-[14px] font-semibold text-[#0c447c]">{project.address || "-"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8] mb-1">
                <Calendar className="h-3 w-3" /> Boshlanish
              </div>
              <p className="text-[14px] font-semibold text-[#0c447c]">{project.startDate ? new Date(project.startDate).toLocaleDateString("ru-RU") : "-"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8] mb-1">
                <Calendar className="h-3 w-3" /> Tugash
              </div>
              <p className="text-[14px] font-semibold text-[#0c447c]">{project.endDate ? new Date(project.endDate as string).toLocaleDateString("ru-RU") : "-"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8] mb-1">
                <FileSpreadsheet className="h-3 w-3" /> Smetalar soni
              </div>
              <p className="text-[14px] font-semibold text-[#0c447c]">{project.smetaCount}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8] mb-1">
                <FolderOpen className="h-3 w-3" /> Jami byudjet
              </div>
              <p className="text-[14px] font-semibold text-[#185fa5]">{formatMoney(project.smetaBudgetTotal)}</p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="buildings" className="space-y-4">
        <TabsList className="w-full bg-white border border-[#dbe7f3] rounded-[10px] p-1 gap-1 shadow-none">
          <TabsTrigger value="buildings" className="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] text-[13px] data-[state=active]:bg-[#f0f7ff] data-[state=active]:text-[#185fa5] data-[state=active]:shadow-none text-[#64748b]">
            <Building2 className="h-3.5 w-3.5" />
            Binolar ({buildings.length})
          </TabsTrigger>
          <TabsTrigger value="smetas" className="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] text-[13px] data-[state=active]:bg-[#f0f7ff] data-[state=active]:text-[#185fa5] data-[state=active]:shadow-none text-[#64748b]">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Smetalar ({smetaTotal})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] text-[13px] data-[state=active]:bg-[#f0f7ff] data-[state=active]:text-[#185fa5] data-[state=active]:shadow-none text-[#64748b]">
            <Users className="h-3.5 w-3.5" />
            Xodimlar ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buildings">
          <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[#0c447c]">
                <Building2 className="h-4 w-4 text-[#185fa5]" />
                Binolar ro'yxati
              </CardTitle>
              <Button onClick={() => { setBuildingFormData({ name: "", budget: "", startDate: "", endDate: "" }); setBuildingFormError(""); setAddBuildingDialogOpen(true); }} className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                <Plus className="h-4 w-4 mr-1.5" /> Yangi bino
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {buildings.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7ff]">
                    <Building2 className="h-6 w-6 text-[#378add]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0c447c] mb-1">Binolar topilmadi</p>
                  <p className="text-[13px] text-[#94a3b8] mb-4">Agar bino qo'shilmasa, smetalar loyihaga to'g'ridan bog'lanadi</p>
                  <Button onClick={() => { setBuildingFormData({ name: "", budget: "", startDate: "", endDate: "" }); setBuildingFormError(""); setAddBuildingDialogOpen(true); }} className="h-10 rounded-[8px] bg-[#185fa5] px-5 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                    <Plus className="h-4 w-4 mr-1.5" /> Birinchi binoni qo'shing
                  </Button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                  {pagedBuildings.map((building) => (
                    <Link key={building.id} to={`/admin/organizations/${orgId}/projects/${projectId}/buildings/${building.id}`} style={{ textDecoration: "none", display: "block" }} className="rounded-[12px] border border-[#dbe7f3] bg-white p-5 transition-shadow hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0f7ff]">
                            <Building2 className="h-4 w-4 text-[#185fa5]" />
                          </div>
                          <span className="font-semibold text-[15px] text-[#0c447c] truncate">{building.name}</span>
                        </div>
                        <div onClick={e => e.preventDefault()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[#94a3b8] hover:bg-[#f0f7ff]">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedBuilding(building);
                                setBuildingFormData({ name: building.name, budget: building.budget?.toString() || "", startDate: (building as any).startDate?.split("T")[0] || "", endDate: building.endDate?.split("T")[0] || "" });
                                setBuildingFormError("");
                                setEditBuildingDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />Tahrirlash
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setSelectedBuilding(building); setDeleteBuildingDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4 mr-2" />O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-2 text-[13px]">
                        {building.budget !== undefined && building.budget !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#94a3b8]">Byudjet:</span>
                            <span className="font-medium text-[#0c447c]">{formatMoney(building.budget)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[#94a3b8]">Smetalar:</span>
                          <span className="font-medium text-[#0c447c]">{building.smetaCount} ta</span>
                        </div>
                        {building.endDate && (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-[#eef2f7] text-[#64748b]">
                            <Calendar className="h-3.5 w-3.5 text-[#378add]" />
                            <span>Tugash: {new Date(building.endDate).toLocaleDateString("ru-RU")}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {buildingTotalPages > 1 && (
                <TablePagination page={buildingPage} totalPages={buildingTotalPages} onPageChange={setBuildingPage} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smetas">
          <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[#0c447c]">
                  <FileSpreadsheet className="h-4 w-4 text-[#185fa5]" />
                  Smetalar ro'yxati
                </CardTitle>
                <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-center lg:justify-end">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                    <Input
                      placeholder="Nomi bo'yicha qidirish..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSmetaPage(1); }}
                      className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchSmetas} disabled={isLoading} className="h-10 w-10 rounded-[8px] border-[#dbe7f3] text-[#378add] shadow-none hover:bg-[#f0f7ff]">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                  {smetas.length > 0 && (
                    smetas.length === 1 ? (
                      <Button variant="outline" onClick={() => openExcelDialog(smetas[0].id)} className="h-10 rounded-[8px] border-[#dbe7f3] text-[#185fa5] shadow-none hover:bg-[#f0f7ff]">
                        <Upload className="h-4 w-4 mr-1.5" /> Excel yuklash
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-10 rounded-[8px] border-[#dbe7f3] text-[#185fa5] shadow-none hover:bg-[#f0f7ff]">
                            <Upload className="h-4 w-4 mr-1.5" /> Excel yuklash
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {smetas.map((s) => (
                            <DropdownMenuItem key={s.id} onClick={() => openExcelDialog(s.id)}>{s.name}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  )}
                  <Button onClick={openAddSmetaDialog} className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                    <Plus className="h-4 w-4 mr-1.5" /> Yangi smeta
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {error && (
                <div className="flex items-center gap-2 border-b border-[#dbe7f3] bg-red-50 px-5 py-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />{error}
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#378add]" />
                </div>
              ) : smetas.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7ff]">
                    <FileSpreadsheet className="h-6 w-6 text-[#378add]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0c447c] mb-1">Smetalar topilmadi</p>
                  <p className="text-[13px] text-[#94a3b8] mb-4">Loyihaga hali smeta qo'shilmagan</p>
                  <Button onClick={openAddSmetaDialog} className="h-10 rounded-[8px] bg-[#185fa5] px-5 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                    <Plus className="h-4 w-4 mr-1.5" /> Birinchi smetani qo'shing
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white">
                      <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Nomi</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Turi</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Byudjet</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Muddati</TableHead>
                      <TableHead className="w-[64px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smetas.map((smeta) => (
                      <TableRow key={smeta.id} className="h-16 border-b border-[#eef2f7] last:border-b-0 hover:bg-[#f8fafc] cursor-pointer" onClick={() => navigate(`/admin/smetas/${smeta.id}?orgId=${orgId}&projectId=${projectId}`)}>
                        <TableCell className="py-3">
                          <span className="font-medium text-[#185fa5]">{smeta.name}</span>
                          {smeta.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{smeta.description}</div>}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className="rounded-full border border-[#cfe2ff] bg-[#f0f7ff] px-[10px] py-1 text-[11px] font-medium text-[#185fa5] shadow-none">
                            {getSmetaTypeLabel(smeta.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-[13px] font-medium text-[#0c447c]">{formatMoney(smeta.grandTotal || 0)}</TableCell>
                        <TableCell className="py-3 text-[13px] text-muted-foreground">
                          {smeta.deadline ? new Date(smeta.deadline).toLocaleDateString("ru-RU") : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94a3b8] hover:bg-[#f0f7ff]">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSmetaDialog(smeta)}>
                                <Edit className="h-4 w-4 mr-2" />Tahrirlash
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteSmetaDialog(smeta)}>
                                <Trash2 className="h-4 w-4 mr-2" />O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {smetaTotalPages > 1 && (
                <TablePagination page={smetaPage} totalPages={smetaTotalPages} onPageChange={setSmetaPage} summary={`Sahifa ${smetaPage} / ${smetaTotalPages} (${smetaTotal} ta)`} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[#0c447c]">
                  <Users className="h-4 w-4 text-[#185fa5]" />
                  Xodimlar ro'yxati
                </CardTitle>
                <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
                  <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Xodim qidirish..."
                      spellCheck={false}
                      className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                  <Button onClick={openAssignUserDialog} className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Xodim biriktirish
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7ff]">
                    <Users className="h-6 w-6 text-[#378add]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0c447c] mb-1">Xodimlar topilmadi</p>
                  <p className="text-[13px] text-[#94a3b8]">Bu loyihaga hali xodimlar biriktirilmagan</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white">
                      <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Xodim</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Telefon</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Rol</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                      <TableHead className="w-[64px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id} className="h-20 border-b border-[#eef2f7] last:border-b-0 hover:bg-[#f8fafc]">
                        <TableCell className="py-4">
                          <div className="font-medium text-[#0c447c]">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.projectOrgRoleName || user.role}</div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-muted-foreground">{user.phone || "—"}</TableCell>
                        <TableCell className="py-4">
                          <Badge className="rounded-full border border-[#cfe2ff] bg-[#f0f7ff] px-[10px] py-1 text-[11px] font-medium text-[#185fa5] shadow-none">
                            {user.projectOrgRoleName || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${user.isActive ? "border border-[#c8efd8] bg-[#ecfbf1] text-[#1d9e75]" : "border border-[#dbe7f3] bg-[#f8fbff] text-[#64748b]"}`}>
                            {user.isActive ? "Faol" : "Nofaol"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fff0f0]"
                            onClick={() => handleUnassignUser(user.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {userTotalPages > 1 && (
                <TablePagination page={userPage} totalPages={userTotalPages} onPageChange={setUserPage} summary={`Sahifa ${userPage} / ${userTotalPages} (${filteredUsers.length} ta)`} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Smeta Dialog */}
      <Dialog open={addSmetaDialogOpen} onOpenChange={setAddSmetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi smeta</DialogTitle>
            <DialogDescription>Loyihaga yangi smeta qo'shing</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Smeta nomi"
                value={smetaFormData.name}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={smetaFormData.type}
                onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                placeholder="Qisqacha tavsif"
                value={smetaFormData.description}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={smetaFormData.budget}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input
                  type="date"
                  value={smetaFormData.deadline}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSmetaDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddSmeta} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Smeta Dialog */}
      <Dialog open={editSmetaDialogOpen} onOpenChange={setEditSmetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Smetani tahrirlash</DialogTitle>
            <DialogDescription>Smeta ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={smetaFormData.name}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={smetaFormData.type}
                onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                value={smetaFormData.description}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  value={smetaFormData.budget}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input
                  type="date"
                  value={smetaFormData.deadline}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSmetaDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleEditSmeta} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Smeta Dialog */}
      <AlertDialog open={deleteSmetaDialogOpen} onOpenChange={setDeleteSmetaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smetani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedSmeta?.name}</strong> smetasini o'chirmoqchimisiz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSmeta}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />O'chirilmoqda...</> : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Building Dialog */}
      <Dialog open={addBuildingDialogOpen} onOpenChange={setAddBuildingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi bino</DialogTitle>
            <DialogDescription>Loyihaga yangi bino qo'shing</DialogDescription>
          </DialogHeader>
          {buildingFormError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{buildingFormError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Bino nomi"
                value={buildingFormData.name}
                onChange={(e) => setBuildingFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={buildingFormData.budget}
                  onChange={(e) => setBuildingFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Boshlanish sanasi</Label>
                <Input
                  type="date"
                  value={buildingFormData.startDate}
                  onChange={(e) => setBuildingFormData((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tugash sanasi</Label>
              <Input
                type="date"
                value={buildingFormData.endDate}
                onChange={(e) => setBuildingFormData((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBuildingDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleAddBuilding} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Building Dialog */}
      <Dialog open={editBuildingDialogOpen} onOpenChange={setEditBuildingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Binoni tahrirlash</DialogTitle>
            <DialogDescription>Bino ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {buildingFormError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{buildingFormError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={buildingFormData.name}
                onChange={(e) => setBuildingFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  value={buildingFormData.budget}
                  onChange={(e) => setBuildingFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Boshlanish sanasi</Label>
                <Input
                  type="date"
                  value={buildingFormData.startDate}
                  onChange={(e) => setBuildingFormData((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tugash sanasi</Label>
              <Input
                type="date"
                value={buildingFormData.endDate}
                onChange={(e) => setBuildingFormData((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBuildingDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleEditBuilding} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Building Dialog */}
      <AlertDialog open={deleteBuildingDialogOpen} onOpenChange={setDeleteBuildingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Binoni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedBuilding?.name}</strong> binoni o'chirmoqchimisiz? Bino ichidagi smetalar ham o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBuilding}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />O'chirilmoqda...</> : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel Upload Dialog */}
      <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
        <DialogContent className="!w-[96vw] !max-w-[96vw] h-[calc(100vh-32px)] max-h-[calc(100vh-32px)] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-7 pt-6 pb-0 shrink-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-medium">Smeta elementlarini Excel orqali yuklash</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Excel fayl formati: <strong className="text-foreground font-medium">Nomi</strong> | <strong className="text-foreground font-medium">Birligi</strong> | <strong className="text-foreground font-medium">Miqdori</strong> | <strong className="text-foreground font-medium">Narxi</strong> <span className="text-muted-foreground/60">(1-qator sarlavha)</span>
                </p>
              </div>
            </div>

            {excelError && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{excelError}</div>
            )}

            {/* File upload area */}
            <div
              className="mt-4 border border-dashed border-muted-foreground/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{excelFileName || "Excel faylni tanlang (.xlsx, .xls)"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bosing yoki faylni bu yerga tashlang</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} />
            </div>

            {/* Row count */}
            {excelRows.length > 0 && (
              <div className="flex items-center gap-2 mt-4 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">{excelRows.length} ta element topildi</span>
              </div>
            )}
          </div>

          {/* Table */}
          {excelRows.length > 0 && (
            <div className="flex-1 overflow-auto border-t border-border min-h-0">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-10">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[38%]">Nomi</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[16%]">Birligi</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[12%]">Miqdori</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[18%]">Narxi</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[12%]">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {excelRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 break-words leading-snug">{row.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.unit}</td>
                      <td className="px-4 py-2.5 text-right">{row.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{row.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{(row.quantity * row.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/30 shrink-0">
            <p className="text-sm text-muted-foreground">
              Jami: <strong className="text-foreground font-medium">{excelRows.length.toLocaleString()}</strong> ta element yuklanadi
            </p>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setExcelDialogOpen(false)} disabled={excelUploading}>
                Bekor qilish
              </Button>
              <Button onClick={handleExcelUpload} disabled={excelRows.length === 0 || excelUploading}>
                {excelUploading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yuklanmoqda...</>
                  : <><Upload className="h-4 w-4 mr-2" />{excelRows.length} ta element yuklash</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign User to Project Dialog */}
      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Xodim biriktirish</DialogTitle>
                <DialogDescription>Loyihaga xodim tayinlang</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Xodim</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-12 w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Xodim tanlang" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {allOrgUsers
                    .filter((u) => !users.some((pu) => pu.id === u.id))
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bu loyihadagi roli <span className="text-muted-foreground font-normal">(ixtiyoriy)</span></Label>
              <Select value={selectedUserOrgRoleId} onValueChange={setSelectedUserOrgRoleId}>
                <SelectTrigger className="h-12 w-full"><SelectValue placeholder="Global rol ishlatiladi" /></SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {users.length > 0 && (
              <div className="space-y-2">
                <Label>Tayinlangan xodimlar</Label>
                <div className="space-y-1.5">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{u.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{u.projectOrgRoleName || u.role}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-7 px-2"
                        onClick={() => handleUnassignUser(u.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleAssignUser} disabled={!selectedUserId}>Tayinlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
