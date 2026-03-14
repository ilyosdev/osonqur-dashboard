import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Package,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smetasApi, Smeta } from "@/lib/api/smetas";
import { smetaItemsApi, SmetaItemType, CreateSmetaItemRequest } from "@/lib/api/smeta-items";

const ITEM_TYPES: { value: SmetaItemType; label: string }[] = [
  { value: "WORK", label: "Ish" },
  { value: "MACHINE", label: "Texnika" },
  { value: "MATERIAL", label: "Material" },
  { value: "OTHER", label: "Boshqa" },
];

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("uz-UZ");
}

export default function AddSmetaItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [smeta, setSmeta] = useState<Smeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSmeta, setIsLoadingSmeta] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemType: "MATERIAL" as SmetaItemType,
    category: "",
    code: "",
    name: "",
    unit: "",
    quantity: 0,
    quantityDisplay: "",
    unitPrice: 0,
    unitPriceDisplay: "",
  });

  useEffect(() => {
    const fetchSmeta = async () => {
      if (!id) return;
      try {
        const data = await smetasApi.getById(id);
        setSmeta(data);
      } catch (err) {
        console.error("Error fetching smeta:", err);
      } finally {
        setIsLoadingSmeta(false);
      }
    };
    fetchSmeta();
  }, [id]);

  const handleQuantityChange = (value: string) => {
    const numValue = parseNumber(value);
    setFormData((prev) => ({
      ...prev,
      quantity: numValue,
      quantityDisplay: formatNumberInput(numValue),
    }));
  };

  const handleUnitPriceChange = (value: string) => {
    const numValue = parseNumber(value);
    setFormData((prev) => ({
      ...prev,
      unitPrice: numValue,
      unitPriceDisplay: formatNumberInput(numValue),
    }));
  };

  const totalAmount = formData.quantity * formData.unitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!formData.name.trim()) {
      setError("Element nomini kiriting");
      return;
    }

    if (!formData.unit.trim()) {
      setError("O'lchov birligini kiriting");
      return;
    }

    if (formData.quantity <= 0) {
      setError("Miqdorni kiriting");
      return;
    }

    if (formData.unitPrice <= 0) {
      setError("Narxni kiriting");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: CreateSmetaItemRequest = {
        smetaId: id,
        itemType: formData.itemType,
        category: formData.category.trim() || formData.itemType,
        code: formData.code.trim() || undefined,
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
      };

      await smetaItemsApi.create(payload);
      navigate(`/smetas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Element qo'shishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSmeta) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to={`/smetas/${id}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Yangi element qo'shish
          </CardTitle>
          <CardDescription>
            {smeta ? `"${smeta.name}" smetasiga yangi element qo'shing` : "Smetaga yangi element qo'shing"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Element turi</Label>
                <Select
                  value={formData.itemType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, itemType: value as SmetaItemType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoriya</Label>
                <Input
                  id="category"
                  placeholder="Masalan: Beton ishlari"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kod (ixtiyoriy)</Label>
                <Input
                  id="code"
                  placeholder="Masalan: ЕР-01-001"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nomi *</Label>
                <Input
                  id="name"
                  placeholder="Masalan: Beton M200"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">O'lchov birligi *</Label>
                <Input
                  id="unit"
                  placeholder="Masalan: m³"
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Miqdori *</Label>
                <Input
                  id="quantity"
                  placeholder="0"
                  value={formData.quantityDisplay}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Birlik narxi *</Label>
                <div className="relative">
                  <Input
                    id="unitPrice"
                    placeholder="0"
                    value={formData.unitPriceDisplay}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    so'm
                  </span>
                </div>
              </div>
            </div>

            {totalAmount > 0 && (
              <Card className="p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Jami summa:</span>
                  <span className="text-xl font-bold">
                    {totalAmount.toLocaleString("uz-UZ")} so'm
                  </span>
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(`/smetas/${id}`)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Qo'shilmoqda...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Qo'shish
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
