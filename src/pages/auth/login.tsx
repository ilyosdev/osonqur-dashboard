import { Suspense, useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { HardHat, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'OPERATOR';

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(isAdmin ? '/admin' : callbackUrl, { replace: true });
    }
  }, [authLoading, isAuthenticated, isAdmin, callbackUrl, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(errorParam || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const fullPhone = "+998" + phone.replace(/\s/g, "");

    try {
      await login(fullPhone, password);
      // Redirect will be handled by the useEffect above after user state updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirish xatoligi");
      setIsLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
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
          <CardTitle className="text-xl">Tizimga kirish</CardTitle>
          <CardDescription className="mt-1">
            Hisobingizga kirish uchun ma'lumotlarni kiriting
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon raqam</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                +998
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="__ ___ __ __"
                value={phone}
                onChange={handlePhoneChange}
                className="pl-14 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Parolingizni kiriting"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Eslab qolish
              </Label>
            </div>
            <span className="text-sm text-muted-foreground cursor-default">
              Parolni unutdingizmi? (Tez orada)
            </span>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kirish...
              </>
            ) : (
              "Kirish"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Tizimga kirishda muammo bormi?{" "}
            <a
              href="https://t.me/smetakon_support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Yordam
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="w-full shadow-2xl shadow-primary/10 border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}
