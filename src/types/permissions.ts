export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
  DIREKTOR = 'DIREKTOR',
  BOSS = 'BOSS',
  BUGALTERIYA = 'BUGALTERIYA',
  PTO = 'PTO',
  SNABJENIYA = 'SNABJENIYA',
  SKLAD = 'SKLAD',
  PRORAB = 'PRORAB',
  HAYDOVCHI = 'HAYDOVCHI',
  MODERATOR = 'MODERATOR',
  WORKER = 'WORKER',
  POSTAVSHIK = 'POSTAVSHIK',
}

export enum SubscriptionTier {
  ODDIY = 'ODDIY',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export const PERMISSIONS = {
  // Admin
  "admin:operators": ["SUPER_ADMIN"],
  "admin:organizations": ["SUPER_ADMIN", "OPERATOR"],
  "admin:org_users": ["SUPER_ADMIN", "OPERATOR", "ADMIN"],
  "admin:org_projects": ["SUPER_ADMIN", "OPERATOR", "ADMIN"],

  // Organization
  "org:create": ["DIREKTOR"],
  "org:edit": ["DIREKTOR"],
  "org:invite": ["DIREKTOR"],

  // Projects (formerly Obyekts)
  "project:create": ["BOSS", "DIREKTOR"],
  "project:edit": ["BOSS", "DIREKTOR"],
  "project:delete": ["BOSS"],
  "project:view": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
    "SKLAD",
    "PRORAB",
  ],

  // Smeta
  "smeta:upload": ["DIREKTOR", "PTO"],
  "smeta:edit": ["DIREKTOR", "PTO"],
  "smeta:delete": ["DIREKTOR"],
  "smeta:view": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
    "SKLAD",
    "PRORAB",
  ],
  "smeta:validate": ["PTO", "DIREKTOR"],

  // Purchase Requests (Zayavka)
  "request:create": ["PRORAB", "SNABJENIYA", "DIREKTOR"],
  "request:approve": ["DIREKTOR"],
  "request:reject": ["DIREKTOR"],
  "request:view_all": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
  ],
  "request:view_own": ["PRORAB", "SKLAD"],
  "request:cancel_own": ["PRORAB", "SNABJENIYA", "DIREKTOR"],

  // Financial - Income (Kirim)
  "income:create": ["BUGALTERIYA", "DIREKTOR"],
  "income:edit": ["BUGALTERIYA", "DIREKTOR"],
  "income:delete": ["DIREKTOR"],
  "income:view": ["BOSS", "DIREKTOR", "BUGALTERIYA"],

  // Financial - Expense (Rasxod)
  "expense:create": ["BUGALTERIYA", "PRORAB", "DIREKTOR"],
  "expense:edit": ["BUGALTERIYA", "DIREKTOR"],
  "expense:delete": ["DIREKTOR"],
  "expense:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "PTO"],

  // Cash Register (Kashlok)
  "kashlok:manage": ["BUGALTERIYA", "DIREKTOR"],
  "kashlok:view_all": ["DIREKTOR", "BUGALTERIYA"],
  "kashlok:view_own": ["PRORAB"],
  "kashlok:transfer": ["BUGALTERIYA", "DIREKTOR"],

  // Accounts (Shot)
  "account:manage": ["BUGALTERIYA", "DIREKTOR"],
  "account:view": ["BOSS", "DIREKTOR", "BUGALTERIYA"],

  // Suppliers (Pastavshik)
  "supplier:create": ["SNABJENIYA", "DIREKTOR"],
  "supplier:edit": ["SNABJENIYA", "DIREKTOR"],
  "supplier:delete": ["DIREKTOR"],
  "supplier:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "SNABJENIYA"],

  // Supply Orders (Buyurtma)
  "order:create": ["SNABJENIYA", "DIREKTOR"],
  "order:edit": ["SNABJENIYA", "DIREKTOR"],
  "order:delete": ["DIREKTOR"],
  "order:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "SNABJENIYA", "SKLAD"],
  "delivery:confirm": ["SNABJENIYA", "SKLAD"],

  // Supplier Debt (Pastavshik Qarz)
  "supplier_debt:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "SNABJENIYA"],
  "supplier_debt:pay": ["BUGALTERIYA", "DIREKTOR"],

  // Workers (Usta)
  "worker:create": ["PRORAB", "DIREKTOR"],
  "worker:edit": ["PRORAB", "DIREKTOR"],
  "worker:delete": ["DIREKTOR"],
  "worker:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "PTO", "PRORAB"],
  "worker:pay": ["BUGALTERIYA", "PRORAB", "DIREKTOR"],

  // Work Logs (Bajarilgan Ish)
  "worklog:create": ["PRORAB"],
  "worklog:edit": ["PRORAB", "PTO", "DIREKTOR"],
  "worklog:delete": ["DIREKTOR"],
  "worklog:view": ["BOSS", "DIREKTOR", "PTO", "BUGALTERIYA", "PRORAB"],
  "worklog:validate": ["PTO", "DIREKTOR"],

  // Warehouse (Sklad)
  "warehouse:create": ["DIREKTOR", "SKLAD"],
  "warehouse:edit": ["DIREKTOR", "SKLAD"],
  "warehouse:delete": ["DIREKTOR"],
  "warehouse:view": ["BOSS", "DIREKTOR", "SKLAD", "PRORAB", "SNABJENIYA"],
  "warehouse:receive": ["SKLAD"],
  "warehouse:issue": ["SKLAD"],
  "warehouse:transfer": ["SKLAD", "DIREKTOR"],

  // Inventory
  "inventory:view": [
    "BOSS",
    "DIREKTOR",
    "SKLAD",
    "SNABJENIYA",
    "PRORAB",
  ],

  // Manual Purchases / Receipts
  "receipt:submit": ["PRORAB", "SNABJENIYA", "BUGALTERIYA", "DIREKTOR"],
  "receipt:view_all": ["DIREKTOR", "BUGALTERIYA", "PTO"],
  "receipt:view_own": ["PRORAB", "SNABJENIYA"],
  "receipt:delete": ["DIREKTOR"],

  // Reports
  "report:view": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
    "SKLAD",
    "PRORAB",
  ],
  "report:export": ["BOSS", "DIREKTOR", "BUGALTERIYA", "PTO"],

  // Dashboard / Statistics
  "dashboard:view": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
    "SKLAD",
    "PRORAB",
  ],
  "statistics:view": ["BOSS", "DIREKTOR", "BUGALTERIYA"],

  // Debt Overview
  "debt:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "SNABJENIYA", "PRORAB"],

  // Kassa (Personal Wallet)
  "kassa:view": ["BOSS", "DIREKTOR", "BUGALTERIYA", "PTO", "SNABJENIYA", "SKLAD", "PRORAB"],
  "kassa:request_money": ["BOSS", "DIREKTOR", "PTO", "SNABJENIYA", "SKLAD", "PRORAB"],
  "kassa:add_expense": ["BOSS", "DIREKTOR", "BUGALTERIYA", "PTO", "SNABJENIYA", "SKLAD", "PRORAB"],

  // Cash Requests
  "cash_request:create": ["BOSS", "DIREKTOR", "PTO", "SNABJENIYA", "SKLAD", "PRORAB"],
  "cash_request:approve": ["BOSS", "DIREKTOR", "BUGALTERIYA"],

  // Audit
  "audit:view": ["DIREKTOR", "BUGALTERIYA"],

  // Users
  "user:invite": ["DIREKTOR"],
  "user:edit": ["DIREKTOR"],
  "user:delete": ["DIREKTOR"],
  "user:view": [
    "BOSS",
    "DIREKTOR",
    "BUGALTERIYA",
    "PTO",
    "SNABJENIYA",
  ],

  // Telegram
  "telegram:connect": ["DIREKTOR"],
  "telegram:disconnect": ["DIREKTOR"],

  // Worker Portal
  "worker_portal:view": ["WORKER"],
  "worker_portal:work_logs": ["WORKER"],
  "worker_portal:payments": ["WORKER"],

  // Supplier Portal
  "supplier_portal:view": ["POSTAVSHIK"],
  "supplier_portal:orders": ["POSTAVSHIK"],
  "supplier_portal:debts": ["POSTAVSHIK"],

  // Driver
  "driver:view_assigned": ["HAYDOVCHI"],
  "driver:mark_collected": ["HAYDOVCHI"],
  "driver:mark_delivered": ["HAYDOVCHI"],

  // Moderator
  "moderator:view_pending": ["MODERATOR"],
  "moderator:finalize": ["MODERATOR"],

  // Smeta Comparison
  "smeta_comparison:view": ["DIREKTOR", "BOSS", "PTO", "BUGALTERIYA"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

export function checkPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function canAssignRole(
  assignerRole: UserRole,
  targetRole: UserRole
): boolean {
  const hierarchy: Record<UserRole, number> = {
    SUPER_ADMIN: 10,
    OPERATOR: 9,
    ADMIN: 8,
    DIREKTOR: 7,
    BOSS: 6,
    BUGALTERIYA: 5,
    PTO: 5,
    SNABJENIYA: 5,
    SKLAD: 4,
    MODERATOR: 4,
    PRORAB: 3,
    HAYDOVCHI: 2,
    WORKER: 1,
    POSTAVSHIK: 1,
  };

  if (assignerRole === "SUPER_ADMIN") return true;
  if (assignerRole === "OPERATOR") return targetRole !== "SUPER_ADMIN" && targetRole !== "OPERATOR";
  // ADMIN cannot create other ADMINs
  if (assignerRole === "ADMIN") return targetRole !== "SUPER_ADMIN" && targetRole !== "OPERATOR" && targetRole !== "ADMIN";
  if (assignerRole === "DIREKTOR") return !["SUPER_ADMIN","OPERATOR","ADMIN","BOSS"].includes(targetRole);
  if (targetRole === "DIREKTOR") return false;
  if (targetRole === "BOSS") return false;

  return hierarchy[assignerRole] > hierarchy[targetRole];
}
