import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { projectsApi, Project } from "@/lib/api/projects";
import { telegramGroupsApi, TelegramGroup } from "@/lib/api/telegram-groups";
import { ErrorMessage } from "@/components/ui/error-message";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "SmetakonBot";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [telegramGroup, setTelegramGroup] = useState<TelegramGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Smetalar</p>
                <p className="text-xl font-semibold">0</p>
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
                <p className="text-xl font-semibold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Byudjet (Smetalardan)</p>
                <p className="text-xl font-semibold">{project.budget ? formatBudget(project.budget) : "Belgilanmagan"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`/smetas/new?projectId=${id}`}>
            <Plus className="h-4 w-4 mr-2" />
            Smeta qo'shish
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/smetas?projectId=${id}`}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Smetalarni ko'rish
          </Link>
        </Button>
      </div>
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
