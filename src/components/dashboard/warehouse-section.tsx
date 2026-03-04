import { useState } from "react";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 30;

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

interface WarehouseSectionProps {
  className?: string;
  projectId?: string;
}

export function WarehouseSection({ className, projectId }: WarehouseSectionProps) {
  const [page, setPage] = useState(1);

  const {
    data: requestsData,
    loading,
  } = useApi(
    () => requestsApi.getAll({
      status: "FINALIZED",
      limit: ITEMS_PER_PAGE,
      page,
      ...(projectId && { projectId }),
    }),
    [page, projectId]
  );

  const items = requestsData?.data || [];
  const total = requestsData?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Calculate grand total
  const grandTotal = items.reduce((sum, item) => {
    const unitPrice = item.smetaItem?.unitPrice || 0;
    return sum + (item.requestedQty * unitPrice);
  }, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Sklad
          </CardTitle>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {total} ta material
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <WarehouseSkeleton />
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Skladda material yo'q</p>
            <p className="text-sm mt-1">Tugallangan zayavkalar bu yerda ko'rinadi</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Material</TableHead>
                    <TableHead className="text-right">Miqdor</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Narx</TableHead>
                    <TableHead className="text-right">Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <WarehouseRow key={item.id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between mt-4 px-3 py-3 bg-primary/5 rounded-lg">
              <span className="font-medium">Jami qiymat:</span>
              <span className="text-lg font-bold text-primary">
                {formatMoney(grandTotal)} so'm
              </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Sahifa {page} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Keyingi
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WarehouseRow({ item }: { item: PurchaseRequest }) {
  const name = item.smetaItem?.name || "Noma'lum";
  const unit = item.smetaItem?.unit || "";
  const unitPrice = item.smetaItem?.unitPrice || 0;
  const quantity = item.requestedQty;
  const total = quantity * unitPrice;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="truncate max-w-[200px]" title={name}>
          {name}
        </div>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {formatMoney(quantity)} {unit}
      </TableCell>
      <TableCell className="text-right hidden sm:table-cell">
        {formatMoney(unitPrice)} so'm
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap">
        {formatMoney(total)} so'm
      </TableCell>
    </TableRow>
  );
}

function WarehouseSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
