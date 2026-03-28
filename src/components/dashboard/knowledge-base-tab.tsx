import { useState, useCallback, useRef } from "react";
import {
  Upload,
  Trash2,
  Search,
  FileSpreadsheet,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApi, useMutation } from "@/hooks/use-api";
import {
  knowledgeApi,
  type KnowledgeDocument,
  type SearchResult,
} from "@/lib/api/knowledge";

const DOC_TYPE_LABELS: Record<string, string> = {
  CATALOG: "Katalog",
  SMETA: "Smeta",
  MATERIAL_LIST: "Material ro'yxati",
  GLOSSARY: "Lug'at",
};

export default function KnowledgeBaseTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch documents list
  const {
    data: documents,
    loading: isLoadingDocs,
    refetch: refetchDocs,
  } = useApi<KnowledgeDocument[]>(() => knowledgeApi.getDocuments(), []);

  // Upload mutation
  const { loading: isUploading, mutate: uploadFile } = useMutation(
    (file: File) => knowledgeApi.upload(file)
  );

  // Delete mutation
  const { loading: isDeleting, mutate: deleteDoc } = useMutation(
    (documentId: string) => knowledgeApi.deleteDocument(documentId)
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadMessage(null);
      try {
        const result = await uploadFile(file);
        setUploadMessage({
          type: "success",
          text: `"${result.source}" muvaffaqiyatli yuklandi. ${result.chunksCreated} ta bo'lak yaratildi.`,
        });
        refetchDocs();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Yuklashda xatolik yuz berdi";
        setUploadMessage({ type: "error", text: message });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile, refetchDocs]
  );

  const handleDelete = useCallback(
    async (documentId: string, source: string) => {
      if (!confirm(`"${source}" hujjatini o'chirishni tasdiqlaysizmi?`)) return;

      try {
        await deleteDoc(documentId);
        setUploadMessage({
          type: "success",
          text: `"${source}" muvaffaqiyatli o'chirildi.`,
        });
        refetchDocs();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "O'chirishda xatolik yuz berdi";
        setUploadMessage({ type: "error", text: message });
      }
    },
    [deleteDoc, refetchDocs]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await knowledgeApi.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Hujjat yuklash
          </CardTitle>
          <CardDescription>
            Excel fayllarini (.xlsx, .xls) yuklang. Fayllar avtomatik ravishda
            bo'laklarga ajratiladi va bilim bazasiga qo'shiladi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
              className="max-w-sm"
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Yuklanmoqda...</span>
              </div>
            )}
          </div>

          {uploadMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${
                uploadMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {uploadMessage.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Yuklangan hujjatlar
          </CardTitle>
          <CardDescription>
            Bilim bazasidagi barcha hujjatlar ro'yxati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="divide-y divide-border rounded-lg border">
              {documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                        {" · "}
                        {doc.chunkCount} ta bo'lak
                        {" · "}
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.documentId, doc.source)}
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hozircha hujjatlar yuklanmagan</p>
              <p className="text-sm mt-1">
                Yuqoridagi formadan Excel fayllarini yuklang
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Qidiruv testi
          </CardTitle>
          <CardDescription>
            Bilim bazasidan qidirish va natijalarni tekshirish
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Qidiruv so'zini kiriting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              disabled={isSearching}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Qidirish</span>
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} ta natija topildi
              </p>
              <div className="divide-y divide-border rounded-lg border">
                {searchResults.map((result, index) => (
                  <div key={index} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {DOC_TYPE_LABELS[result.documentType] ||
                          result.documentType}
                        {" · "}
                        {result.source}
                      </span>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          result.similarity >= 0.7
                            ? "bg-green-100 text-green-700"
                            : result.similarity >= 0.4
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm">{result.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
