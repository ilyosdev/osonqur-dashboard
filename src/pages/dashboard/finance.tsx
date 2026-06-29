import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Plus, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi, useMutation } from "@/hooks/use-api";
import { incomesApi, expensesApi, cashRegistersApi, cashRequestsApi } from "@/lib/api/finance";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project-context";

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

const categoryNames: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Ish haqi",
  EQUIPMENT: "Texnika",
  TRANSPORT: "Transport",
  OTHER: "Boshqa",
};

const expenseCategories = ["MATERIAL", "LABOR", "EQUIPMENT", "TRANSPORT", "OTHER"];

export default function FinancePage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canCreateIncome = hasPermission("income:create");
  const canViewIncome = canCreateIncome || hasPermission("income:view");
  const canViewExpenses = hasPermission("expense:view");
  const canCreateExpense = hasPermission("expense:create") || hasPermission("expense:view");
  const canViewKassas = hasPermission("kashlok:view_all");
  const canViewCashRequests = hasPermission("cash_request:approve");

  const location = useLocation();
  const urlTab = new URLSearchParams(location.search).get("tab");
  const defaultTab = canViewIncome ? "income" : canViewExpenses ? "expenses" : canViewCashRequests ? "cash-requests" : "kosheloks";
  const [activeTab, setActiveTab] = useState(urlTab || defaultTab);

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
  }, [urlTab]);

  // Create income dialog state
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomePaymentType, setIncomePaymentType] = useState<'CASH' | 'CARD' | 'TRANSFER'>("CASH");
  const [incomeNote, setIncomeNote] = useState("");

  // Create expense dialog state
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseRecipient, setExpenseRecipient] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("OTHER");
  const [expensePaymentType, setExpensePaymentType] = useState<'CASH' | 'CARD' | 'TRANSFER'>("CASH");
  const [expenseNote, setExpenseNote] = useState("");

  const { mutate: createIncome, loading: creatingIncome } = useMutation(
    (data: { projectId: string; amount: number; source: string; paymentType: 'CASH' | 'CARD' | 'TRANSFER'; note?: string }) =>
      incomesApi.create(data)
  );
  const { mutate: createExpense, loading: creatingExpense } = useMutation(
    (data: { projectId: string; amount: number; recipient: string; paymentType: 'CASH' | 'CARD' | 'TRANSFER'; category: string; note?: string }) =>
      expensesApi.create(data)
  );
  const { mutate: approveCash } = useMutation((id: string) => cashRequestsApi.approve(id));
  const { mutate: rejectCash } = useMutation((id: string) => cashRequestsApi.reject(id, {}));

  const { data: incomesResponse, loading: incomesLoading, error: incomesError, refetch: refetchIncomes } =
    useApi(() => incomesApi.getAll({ limit: 50 }), [], { enabled: canViewIncome });

  const { data: expensesResponse, loading: expensesLoading, error: expensesError, refetch: refetchExpenses } =
    useApi(() => expensesApi.getAll({ limit: 50 }), [], { enabled: canViewExpenses });

  const { data: cashRequestsResponse, loading: cashRequestsLoading, refetch: refetchCashRequests } =
    useApi(() => cashRequestsApi.getAll({ status: "PENDING", limit: 50 }), [], { enabled: canViewCashRequests });

  const { data: cashRegistersResponse, loading: cashRegistersLoading } =
    useApi(() => cashRegistersApi.getAll({ limit: 100 }), [], { enabled: canViewKassas });

  const incomes = incomesResponse?.data || [];
  const expenses = expensesResponse?.data || [];
  const cashRequests = cashRequestsResponse?.data || [];
  const cashRegisters = cashRegistersResponse?.data || [];

  const error = incomesError || expensesError;

  const tabTitle: Record<string, string> = {
    income: "Kirim",
    expenses: "Umumiy rasxodlar",
    "cash-requests": "Pul zayavkalari",
    kosheloks: "Kosheloklar",
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Moliya</h1>
        </div>
        <ErrorMessage error={error} onRetry={refetchIncomes} />
      </div>
    );
  }

  const handleCreateIncome = async () => {
    if (!incomeAmount || !incomeSource || !selectedProjectId) return;
    await createIncome({
      projectId: selectedProjectId,
      amount: Number(incomeAmount),
      source: incomeSource,
      paymentType: incomePaymentType,
      note: incomeNote || undefined,
    });
    setShowIncomeDialog(false);
    setIncomeAmount(""); setIncomeSource(""); setIncomeNote("");
    refetchIncomes();
  };

  const handleCreateExpense = async () => {
    if (!expenseAmount || !expenseRecipient || !selectedProjectId) return;
    await createExpense({
      projectId: selectedProjectId,
      amount: Number(expenseAmount),
      recipient: expenseRecipient,
      paymentType: expensePaymentType,
      category: expenseCategory,
      note: expenseNote || undefined,
    });
    setShowExpenseDialog(false);
    setExpenseAmount(""); setExpenseRecipient(""); setExpenseNote("");
    refetchExpenses();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{tabTitle[activeTab] || "Moliya"}</h1>
          <p className="text-muted-foreground">Moliyaviy operatsiyalar</p>
        </div>
        {activeTab === "income" && canCreateIncome && (
          <Button size="sm" onClick={() => setShowIncomeDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Kirim qo'shish
          </Button>
        )}
        {activeTab === "expenses" && canCreateExpense && (
          <Button size="sm" onClick={() => setShowExpenseDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Chiqim qo'shish
          </Button>
        )}
      </div>

      <Tabs value={activeTab}>
        {/* KIRIM */}
        <TabsContent value="income" className="mt-0">
          {incomesLoading ? (
            <StatsSkeleton />
          ) : incomes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hozircha kirimlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incomes.map((income) => (
                <div key={income.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <p className="font-medium text-sm">{categoryNames[income.category] || income.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(income.date).toLocaleDateString("uz-UZ")}
                      {income.description && ` • ${income.description}`}
                    </p>
                  </div>
                  <p className="font-semibold text-success">+{formatNumber(income.amount)} so'm</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* UMUMIY RASXODLAR */}
        <TabsContent value="expenses" className="mt-0">
          {expensesLoading ? (
            <StatsSkeleton />
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hozircha chiqimlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <p className="font-medium text-sm">{categoryNames[expense.category] || expense.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(expense.date).toLocaleDateString("uz-UZ")}
                      {expense.description && ` • ${expense.description}`}
                    </p>
                  </div>
                  <p className="font-semibold text-destructive">-{formatNumber(expense.amount)} so'm</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PUL ZAYAVKALARI */}
        <TabsContent value="cash-requests" className="mt-0">
          {cashRequestsLoading ? (
            <StatsSkeleton />
          ) : cashRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Kutilayotgan pul zayavkalari yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cashRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{req.requestedBy?.name || "Noma'lum"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.reason || "Sabab ko'rsatilmagan"}
                        {req.project && ` • ${req.project.name}`}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatNumber(req.amount)} so'm</Badge>
                  </div>
                  {canViewCashRequests && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={async () => { await approveCash(req.id); refetchCashRequests(); }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={async () => { await rejectCash(req.id); refetchCashRequests(); }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Rad etish
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* KOSHELOKLAR */}
        <TabsContent value="kosheloks" className="mt-0">
          {cashRegistersLoading ? (
            <StatsSkeleton />
          ) : cashRegisters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hozircha kosheloklar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cashRegisters.map((kassa) => (
                <div key={kassa.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm">{kassa.user?.name || kassa.name}</p>
                    {kassa.user?.orgRoleName && (
                      <Badge variant="secondary" className="text-xs">{kassa.user.orgRoleName}</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(kassa.balance)} so'm</p>
                  {(kassa.totalIn !== undefined || kassa.totalOut !== undefined) && (
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-success">+{formatNumber(kassa.totalIn || 0)}</span>
                      <span className="text-destructive">-{formatNumber(kassa.totalOut || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Kirim qo'shish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Manba (kimdan/nima)</Label>
              <Input value={incomeSource} onChange={e => setIncomeSource(e.target.value)} placeholder="Masalan: investor, bank..." />
            </div>
            <div className="space-y-2">
              <Label>Summa (so'm)</Label>
              <Input type="number" min={1} value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>To'lov turi</Label>
              <Select value={incomePaymentType} onValueChange={v => setIncomePaymentType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Naqd</SelectItem>
                  <SelectItem value="CARD">Karta</SelectItem>
                  <SelectItem value="TRANSFER">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Input value={incomeNote} onChange={e => setIncomeNote(e.target.value)} placeholder="..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>Bekor</Button>
            <Button onClick={handleCreateIncome} disabled={creatingIncome || !incomeAmount || !incomeSource || !selectedProjectId}>
              {creatingIncome ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Chiqim qo'shish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kimga / Nima uchun</Label>
              <Input value={expenseRecipient} onChange={e => setExpenseRecipient(e.target.value)} placeholder="Masalan: qurilish materiallari..." />
            </div>
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => (
                    <SelectItem key={c} value={c}>{categoryNames[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Summa (so'm)</Label>
              <Input type="number" min={1} value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>To'lov turi</Label>
              <Select value={expensePaymentType} onValueChange={v => setExpensePaymentType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Naqd</SelectItem>
                  <SelectItem value="CARD">Karta</SelectItem>
                  <SelectItem value="TRANSFER">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Bekor</Button>
            <Button onClick={handleCreateExpense} disabled={creatingExpense || !expenseAmount || !expenseRecipient || !selectedProjectId}>
              {creatingExpense ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
