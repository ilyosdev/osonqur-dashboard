import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HardHat, Eye, EyeOff, Loader2, Building2, User, Phone, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setTokens } from "@/lib/auth/tokens";
import { useAuth } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

interface RegisterFormData {
  orgName: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<RegisterFormData>({
    orgName: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handleChange = (field: keyof RegisterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === "phone") {
      value = formatPhone(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = (): string | null => {
    if (!formData.orgName.trim()) {
      return "Tashkilot nomini kiriting";
    }
    if (!formData.name.trim()) {
      return "Ismingizni kiriting";
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      return "Telefon raqam yoki email kiriting";
    }
    if (formData.phone.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length !== 9) {
        return "Telefon raqam 9 ta raqamdan iborat bo'lishi kerak";
      }
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Email formati noto'g'ri";
    }
    if (formData.password.length < 6) {
      return "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Parollar mos kelmaydi";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        orgName: formData.orgName.trim(),
        name: formData.name.trim(),
        password: formData.password,
      };

      if (formData.phone.trim()) {
        payload.phone = "+998" + formData.phone.replace(/\s/g, "");
      }

      if (formData.email.trim()) {
        payload.email = formData.email.trim();
      }

      const response = await fetch(`${API_URL}/vendor/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Ro'yxatdan o'tishda xatolik" }));
        throw new Error(errorData.message || "Ro'yxatdan o'tishda xatolik");
      }

      const data = await response.json();

      const tokens = data.tokens || data;
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error("Serverdan noto'g'ri javob keldi");
      }

      setTokens(tokens.accessToken, tokens.refreshToken);
      await refreshAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl shadow-primary/10 border-0 bg-card/95 backdrop-blur-sm animate-fade-in">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-3 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
              <HardHat className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Osonqur</h1>
              <p className="text-xs text-muted-foreground">qurilish boshqaruv tizimi</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-xl">Ro'yxatdan o'tish</CardTitle>
          <CardDescription className="mt-1">
            Tashkilotingiz uchun hisob yarating
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Tashkilot nomi
            </Label>
            <Input
              id="orgName"
              type="text"
              placeholder="Masalan: Alfa Qurilish"
              value={formData.orgName}
              onChange={handleChange("orgName")}
              className="h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              To'liq ismingiz
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Familiya Ism"
              value={formData.name}
              onChange={handleChange("name")}
              className="h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Telefon raqam
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                +998
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="__ ___ __ __"
                value={formData.phone}
                onChange={handleChange("phone")}
                className="pl-14 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email (ixtiyoriy)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange("email")}
              className="h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Parol
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Kamida 6 ta belgi"
                value={formData.password}
                onChange={handleChange("password")}
                className="pr-10 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Parolni tasdiqlang
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Parolni qayta kiriting"
                value={formData.confirmPassword}
                onChange={handleChange("confirmPassword")}
                className="pr-10 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ro'yxatdan o'tilmoqda...
              </>
            ) : (
              "Ro'yxatdan o'tish"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Hisobingiz bormi?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Tizimga kiring
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Ro'yxatdan o'tish orqali{" "}
            <a href="#" className="text-primary hover:underline">
              Foydalanish shartlari
            </a>
            {" "}va{" "}
            <a href="#" className="text-primary hover:underline">
              Maxfiylik siyosati
            </a>
            ga rozilik bildirasiz.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
