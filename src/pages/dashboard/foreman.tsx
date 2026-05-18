import React, { useState } from "react";
import { ClipboardList, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Truck, Package, PackageCheck, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/stats-card";
import { useApi, useMutation } from "@/hooks/use-api";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { useProject } from "@/lib/project-context";

type View = "menu" | "create" | "history";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Snabjeniya tasdig'ini kutmoqda",
  APPROVED: "Tasdiqlandi, snabjeniyada",
  REJECTED: "Rad etildi",
  IN_TRANSIT: "Haydovchida, yo'lda",
  DELIVERED: "Haydovchi yetkazdi, skladda",
  RECEIVED: "Skladchi qabul qildi",
  FINALIZED: "Yakunlandi",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-warning" />,
  APPROVED: <CheckCircle className="h-4 w-4 text-success" />,
  REJECTED: <XCircle className="h-4 w-4 text-destructive" />,
  IN_TRANSIT: <Truck className="h-4 w-4 text-primary" />,
  DELIVERED: <Package className="h-4 w-4 text-primary" />,
  RECEIVED: <PackageCheck className="h-4 w-4 text-success" />,
  FINALIZED: <CheckSquare className="h-4 w-4 text-success" />,
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "outline",
  REJECTED: "destructive",
  IN_TRANSIT: "outline",
  DELIVERED: "outline",
  RECEIVED: "outline",
  FINALIZED: "outline",
};

export default function ForemanPage() {
  const { selectedProjectId, selectedProject } = useProject();
  const [view, setView] = useState<View>("menu");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Zayavkalar</h1>
        {selectedProject && (
          <p className="text-muted-foreground">{selectedProject.name}</p>
        )}
      </div>

      {view === "menu" && <MenuView onSelect={setView} projectId={selectedProjectId} />}
      {view === "create" && <CreateView onBack={() => setView("menu")} projectId={selectedProjectId} />}
      {view === "history" && <HistoryView onBack={() => setView("menu")} projectId={selectedProjectId} />}
    </div>
  );
}

function MenuView({ onSelect, projectId }: { onSelect: (v: View) => void; projectId: string | null }) {
  const { data } = useApi(
    () => requestsApi.getAll({ projectId: projectId || undefined, limit: 100 }),
    [projectId],
    { enabled: !!projectId }
  );

  const requests = data?.data || [];
  const total = requests.length;
  const pending = requests.filter(r => r.status === "PENDING").length;
  const approved = requests.filter(r => ["APPROVED", "IN_TRANSIT", "DELIVERED", "RECEIVED", "FINALIZED"].includes(r.status)).length;

  return (
    <div className="space-y-4">
      {/* Action cards */}
      <div className="flex flex-col gap-2">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect("create")}>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Zayavka qo'shish</p>
              <p className="text-xs text-muted-foreground">Yangi material so'rovi</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect("history")}>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Zayavka tarixi</p>
              <p className="text-xs text-muted-foreground">Yuborilgan zayavkalar</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      {projectId && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard title="Jami zayavkalar" value={String(total)} subtitle="ta" icon={ClipboardList} variant="primary" />
          <StatsCard title="Kutilmoqda" value={String(pending)} subtitle="ta" icon={Clock} variant="warning" />
          <StatsCard title="Tasdiqlangan" value={String(approved)} subtitle="ta" icon={CheckCircle} variant="success" />
        </div>
      )}
    </div>
  );
}

type ParsedItem = { name: string; qty: number; unit: string };

function parseText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  // Split by comma or newline
  const parts = text.split(/[,\n]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    // Match: "NAME UNIT QTY" like "ТРОЙНИК ... ШТ 1,00" or "NAME QTY UNIT" like "Sement 100 qop"
    const m1 = part.match(/^(.+?)\s+(ШТ|шт|dona|kg|кг|м|m|т|ton|qop|litr|л)\s+([\d,\.]+)\s*$/i);
    const m2 = part.match(/^(.+?)\s+([\d,\.]+)\s*(ШТ|шт|dona|kg|кг|м|m|т|ton|qop|litr|л|штук|шт\.?)?\s*$/i);
    if (m1) {
      const qty = parseFloat(m1[3].replace(',', '.'));
      if (!isNaN(qty) && qty > 0) items.push({ name: m1[1].trim(), qty, unit: m1[2] });
    } else if (m2) {
      const qty = parseFloat(m2[2].replace(',', '.'));
      if (!isNaN(qty) && qty > 0) items.push({ name: m2[1].trim(), qty, unit: m2[3] || "dona" });
    } else if (part.length > 2) {
      items.push({ name: part, qty: 1, unit: "dona" });
    }
  }
  return items;
}

function CreateView({ onBack, projectId }: { onBack: () => void; projectId: string | null }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { mutate: submit, loading, error: submitError } = useMutation(async () => {
    if (!projectId) throw new Error("Loyiha tanlanmagan");
    if (!parsed || parsed.length === 0) throw new Error("Material topilmadi");
    const result = await requestsApi.submitText(projectId, parsed);
    setSuccessCount(result.count);
    setParsed(null);
    setText("");
  });

  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    setError("");
    setParsing(true);
    try {
      const result = await requestsApi.parseText(text);
      if (!result.items || result.items.length === 0) {
        setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
        return;
      }
      setParsed(result.items);
    } catch {
      // fallback to local regex
      const items = parseText(text);
      if (items.length === 0) {
        setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
        return;
      }
      setParsed(items);
    } finally {
      setParsing(false);
    }
  };

  if (successCount !== null) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-success mx-auto" />
          <p className="font-semibold text-lg">{successCount} ta zayavka yuborildi!</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setSuccessCount(null)}>Yangi zayavka</Button>
            <Button variant="outline" onClick={onBack}>Orqaga</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Orqaga
        </Button>
        <h2 className="font-semibold">Zayavka qo'shish</h2>
      </div>

      {!projectId && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">Avval loyihani tanlang</p>
      )}

      {!parsed ? (
        <>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Label>Materiallarni yozing (bir nechta bo'lishi mumkin)</Label>
              <Textarea
                placeholder={"Masalan:\nSement 100 qop, armatura 500 kg, rozetka 20 dona\n\nyoki:\nТРОЙНИК СТАЛЬНОЙ... ШТ 1,00\nПЕРЕХОД ПРИВАРНОЙ... ШТ 3,00"}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
          <Button className="w-full" onClick={handleParse} disabled={!text.trim() || !projectId || parsing}>
            {parsing ? "Tahlil qilinmoqda..." : "Davom etish →"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Zayavkalar ro'yxati — tekshiring:</p>
          <div className="space-y-2">
            {parsed.map((item, i) => (
              <Card key={i}>
                <CardContent className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.qty} {item.unit}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 px-2 shrink-0"
                    onClick={() => {
                      const newItems = parsed.filter((_, idx) => idx !== i);
                      if (newItems.length === 0) setParsed(null);
                      else setParsed(newItems);
                    }}
                  >
                    O'chirish
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm font-medium">Jami: {parsed.length} ta zayavka</p>
          {submitError && <p className="text-sm text-destructive">{String(submitError)}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setParsed(null)} className="flex-1">
              Tahrirlash
            </Button>
            <Button onClick={() => submit(undefined)} disabled={loading} className="flex-1">
              {loading ? "Yuborilmoqda..." : "Tasdiqlash"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Bugun",
  week: "Oxirgi hafta",
  month: "Oxirgi oy",
  all: "Barchasi",
};

function getDateRange(period: Period): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") return { dateFrom: startOfDay.toISOString(), dateTo: new Date(startOfDay.getTime() + 86400000).toISOString() };
  if (period === "week") return { dateFrom: new Date(startOfDay.getTime() - 7 * 86400000).toISOString() };
  if (period === "month") return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  return {};
}

const PAGE_SIZE = 10;

function HistoryView({ onBack, projectId }: { onBack: () => void; projectId: string | null }) {
  const [period, setPeriod] = useState<Period>("week");
  const [page, setPage] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<PurchaseRequest[] | null>(null);

  const dateRange = getDateRange(period);
  const { data, loading } = useApi(
    () => requestsApi.getAll({ projectId: projectId || undefined, limit: 200, ...dateRange }),
    [period, projectId],
  );

  const requests = data?.data || [];

  const batchMap = new Map<string, PurchaseRequest[]>();
  for (const req of requests) {
    const key = req.batchId || `single_${req.id}`;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(req);
  }
  const batches = Array.from(batchMap.values()).sort(
    (a, b) => new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime()
  );

  const totalPages = Math.ceil(batches.length / PAGE_SIZE);
  const pageBatches = batches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (selectedBatch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>
            <ChevronLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <h2 className="font-semibold">
            Zayavka #{Math.min(...selectedBatch.map(r => r.requestNumber || 0))} · {new Date(selectedBatch[0].createdAt).toLocaleDateString("uz-UZ")}
          </h2>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-3">
            {selectedBatch.map((req, i) => (
              <div key={req.id} className="border-b last:border-0 pb-3 last:pb-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                    {STATUS_ICON[req.status] || <Package className="h-4 w-4" />}
                    {req.smetaItem?.name || req.note?.split(" | ")[0] || "Noma'lum"}
                  </p>
                  <Badge variant={STATUS_VARIANT[req.status] || "secondary"} className="text-xs shrink-0">
                    {STATUS_LABEL[req.status] || req.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {req.requestedQty} {req.smetaItem?.unit || ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Orqaga
        </Button>
        <h2 className="font-semibold">Zayavka tarixi</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"}
            onClick={() => { setPeriod(p); setPage(0); setSelectedBatch(null); }}>
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {loading && <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>}

      {!loading && batches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Bu davrda zayavkalar topilmadi.
          </CardContent>
        </Card>
      )}

      {pageBatches.map((batch, i) => {
        const globalIndex = page * PAGE_SIZE + i + 1;
        const date = new Date(batch[0].createdAt);
        const statusCounts = batch.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        const minNum = Math.min(...batch.map(r => r.requestNumber || 0));
        const numLabel = `#${minNum}`;

        return (
          <Card key={batch[0].batchId || batch[0].id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedBatch(batch)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{numLabel}</span>
                  <div>
                    <p className="text-sm font-medium">{batch.length} ta mahsulot</p>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString("uz-UZ")} · {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[dominantStatus] || "secondary"} className="text-xs">
                    {STATUS_LABEL[dominantStatus] || dominantStatus}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
