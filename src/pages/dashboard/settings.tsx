import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Building2,
  MessageCircle,
  User,
  Save,
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATOR: "Operator",
  ADMIN: "Admin",
  BOSS: "Boss",
  DIREKTOR: "Direktor",
  BUGALTERIYA: "Buxgalteriya",
  PTO: "PTO",
  SNABJENIYA: "Ta'minot",
  SKLAD: "Ombor",
  PRORAB: "Prorab",
  HAYDOVCHI: "Haydovchi",
  MODERATOR: "Moderator",
  WORKER: "Ishchi",
  POSTAVSHIK: "Yetkazuvchi",
};
import { authApi, telegramGroupsApi, TelegramGroup } from "@/lib/api";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshAuth, currentRole, allowedRoles, switchRole } = useAuth();

  // Loading and status states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // Message states
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram groups state
  const [telegramGroups, setTelegramGroups] = useState<TelegramGroup[]>([]);

  // Organization name (read-only, from profile)
  const [orgName, setOrgName] = useState("");

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    telegramId: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Load profile data from API
  const loadProfileData = useCallback(async () => {
    if (!user) return;

    setIsLoadingProfile(true);
    try {
      const profile = await authApi.getProfile();
      setProfileForm({
        name: profile.name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        telegramId: profile.telegramId || "",
      });
      setOrgName(profile.orgName || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Load telegram groups
  const loadTelegramGroups = useCallback(async () => {
    setIsLoadingTelegram(true);
    try {
      const response = await telegramGroupsApi.getAll({ limit: 100 });
      setTelegramGroups(response.data || []);
    } catch (error) {
      console.error("Failed to load telegram groups:", error);
      setTelegramGroups([]);
    } finally {
      setIsLoadingTelegram(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadProfileData();
    loadTelegramGroups();
  }, [loadProfileData, loadTelegramGroups]);

  // Clear messages after timeout
  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => setProfileMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage]);

  const handleProfileSave = async () => {
    if (!user) return;

    // Validate password fields if trying to change password
    if (passwordForm.newPassword || passwordForm.confirmPassword) {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setProfileMessage({ type: 'error', text: "Yangi parol va tasdiqlash paroli mos kelmadi" });
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        setProfileMessage({ type: 'error', text: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const updateData: Record<string, string | undefined> = {
        name: profileForm.name || undefined,
        phone: profileForm.phone || undefined,
        email: profileForm.email || undefined,
        telegramId: profileForm.telegramId || undefined,
      };

      // Add password if provided
      if (passwordForm.newPassword) {
        updateData.password = passwordForm.newPassword;
      }

      await authApi.updateProfile(user.id, updateData);
      setProfileMessage({ type: 'success', text: "Profil ma'lumotlari muvaffaqiyatli saqlandi" });

      // Clear password fields
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Refresh auth to get updated user info
      await refreshAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xatolik yuz berdi";
      setProfileMessage({ type: 'error', text: message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  const handleSwitchRole = async (role: string) => {
    if (role === currentRole || isSwitchingRole) return;
    setIsSwitchingRole(true);
    try {
      await switchRole(role);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to switch role:', error);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const canSwitchRoles = allowedRoles.length > 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Sozlamalar
        </h1>
        <p className="text-muted-foreground">Tizim sozlamalarini boshqaring</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="organization" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4 mr-2" />
            Tashkilot
          </TabsTrigger>
          <TabsTrigger value="telegram" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Telegram
          </TabsTrigger>
          {canSwitchRoles && (
            <TabsTrigger value="role" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Shield className="h-4 w-4 mr-2" />
              Rol
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tashkilot ma'lumotlari</CardTitle>
              <CardDescription>Tashkilot haqidagi asosiy ma'lumotlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{orgName || "Tashkilot"}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {user?.orgId?.slice(0, 8) || "—"}...
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tashkilot ma'lumotlarini o'zgartirish uchun administratorga murojaat qiling.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Telegram Bot
                  </CardTitle>
                  <CardDescription>Telegram guruhingizni ulash</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTelegramGroups}
                  disabled={isLoadingTelegram}
                >
                  {isLoadingTelegram ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Telegram guruhingizga <span className="font-semibold text-foreground">@SmetakonBot</span> ni qo'shing
                  va <span className="font-mono bg-muted px-1 rounded">/start</span> buyrug'ini yuboring.
                  Bot avtomatik ravishda guruhni ushbu tashkilotga ulaydi.
                </p>
              </div>

              {isLoadingTelegram ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : telegramGroups.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Ulangan guruhlar</h4>
                  <div className="divide-y divide-border rounded-lg border">
                    {telegramGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{group.title || "Nomsiz guruh"}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.project?.name || "Loyihaga ulanmagan"}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          group.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {group.isActive ? "Faol" : "Faol emas"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha ulangan guruhlar yo'q</p>
                  <p className="text-sm mt-1">Yuqoridagi ko'rsatmalarga amal qiling</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canSwitchRoles && (
          <TabsContent value="role" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Rol sozlamalari
                </CardTitle>
                <CardDescription>Mavjud rollar o'rtasida almashtiring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Joriy rol:</p>
                  <Badge className="text-base px-3 py-1">
                    {ROLE_LABELS[currentRole || ''] || currentRole}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Mavjud rollar:</p>
                  <div className="space-y-2">
                    {allowedRoles.map((role) => (
                      <div
                        key={role}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          role === currentRole
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {role === currentRole && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                          <span className={role === currentRole ? 'font-medium' : ''}>
                            {ROLE_LABELS[role] || role}
                          </span>
                        </div>
                        {role === currentRole ? (
                          <Badge variant="secondary">Joriy</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSwitchRole(role)}
                            disabled={isSwitchingRole}
                          >
                            {isSwitchingRole ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Tanlash'
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profil ma'lumotlari</CardTitle>
              <CardDescription>Shaxsiy ma'lumotlaringizni tahrirlang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-xl font-bold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user?.name || profileForm.name || "Foydalanuvchi"}</p>
                      <p className="text-sm text-muted-foreground">{user?.role || "Role"}</p>
                    </div>
                  </div>

                  {profileMessage && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        profileMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {profileMessage.type === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{profileMessage.text}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ism familiya</Label>
                      <Input
                        id="name"
                        placeholder="Ismingiz"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isSavingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={isSavingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        placeholder="+998 XX XXX XX XX"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={isSavingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegramId">Telegram ID</Label>
                      <Input
                        id="telegramId"
                        placeholder="123456789"
                        value={profileForm.telegramId}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, telegramId: e.target.value }))}
                        disabled={isSavingProfile}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Parolni o'zgartirish</h4>
                    <p className="text-sm text-muted-foreground">
                      Parolni o'zgartirish uchun yangi parolni va uni tasdiqlang
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new_password">Yangi parol</Label>
                        <Input
                          id="new_password"
                          type="password"
                          placeholder="Kamida 6 ta belgi"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          disabled={isSavingProfile}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm_password">Parolni tasdiqlang</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          placeholder="Yangi parolni qayta kiriting"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          disabled={isSavingProfile}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile || !profileForm.name}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Saqlash
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
