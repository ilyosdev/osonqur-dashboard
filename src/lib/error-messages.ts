// Maps backend error codes (thrown as HandledException messages) to
// user-facing Uzbek text. The backend returns codes like "INSUFFICIENT_BALANCE"
// in the response `message`; the API client rethrows them as Error.message.
// Any code not in this map falls back to a generic Uzbek message.

const ERROR_MESSAGES: Record<string, string> = {
  // Balans / moliya
  INSUFFICIENT_BALANCE: "Kassada yetarli mablag' yo'q",
  INSUFFICIENT_STOCK: "Omborda yetarli mahsulot yo'q",
  PAYMENT_EXCEEDS_REMAINING: "To'lov summasi qolgan qarzdan oshib ketdi",
  DEPOSIT_FAILED: "Pul kiritishda xatolik yuz berdi",

  // Topilmadi
  PROJECT_NOT_FOUND: "Loyiha topilmadi",
  EXPENSE_NOT_FOUND: "Chiqim topilmadi",
  INCOME_NOT_FOUND: "Kirim topilmadi",
  CASH_REGISTER_NOT_FOUND: "Kassa topilmadi",
  CASH_REQUEST_NOT_FOUND: "Pul so'rovi topilmadi",
  ACCOUNT_NOT_FOUND: "Hisob topilmadi",
  REQUEST_NOT_FOUND: "Zayavka topilmadi",
  SMETA_NOT_FOUND: "Smeta topilmadi",
  SMETA_ITEM_NOT_FOUND: "Smeta elementi topilmadi",
  SUPPLIER_NOT_FOUND: "Postavshik topilmadi",
  SUPPLY_ORDER_NOT_FOUND: "Buyurtma topilmadi",
  WAREHOUSE_NOT_FOUND: "Ombor topilmadi",
  WAREHOUSE_ITEM_NOT_FOUND: "Ombor mahsuloti topilmadi",
  FROM_WAREHOUSE_NOT_FOUND: "Jo'natuvchi ombor topilmadi",
  TO_WAREHOUSE_NOT_FOUND: "Qabul qiluvchi ombor topilmadi",
  TRANSFER_NOT_FOUND: "O'tkazma topilmadi",
  WORKER_NOT_FOUND: "Ishchi topilmadi",
  USER_NOT_FOUND: "Foydalanuvchi topilmadi",
  USER_NOT_FOUND_OR_INACTIVE: "Foydalanuvchi topilmadi yoki faol emas",
  DEBT_NOT_FOUND: "Qarz topilmadi",
  PAYMENT_NOT_FOUND: "To'lov topilmadi",
  MANUAL_PURCHASE_NOT_FOUND: "Xarid topilmadi",

  // Ruxsat / autentifikatsiya
  INSUFFICIENT_PERMISSIONS: "Bu amal uchun ruxsatingiz yo'q",
  FORBIDDEN: "Ruxsat berilmagan",
  INVALID_CREDENTIALS: "Login yoki parol noto'g'ri",
  INVALID_REFRESH_TOKEN: "Sessiya muddati tugagan, qayta kiring",

  // Allaqachon mavjud
  EMAIL_ALREADY_EXISTS: "Bu email allaqachon ro'yxatdan o'tgan",
  PHONE_ALREADY_EXISTS: "Bu telefon raqami allaqachon ro'yxatdan o'tgan",
  TELEGRAM_ID_ALREADY_EXISTS: "Bu Telegram allaqachon ulangan",

  // Status / holat cheklovlari
  CANNOT_UPDATE_NON_PENDING_REQUEST: "Faqat kutilayotgan zayavkani tahrirlash mumkin",
  CANNOT_DELETE_NON_PENDING_REQUEST: "Faqat kutilayotgan zayavkani o'chirish mumkin",
  CANNOT_DELETE_OTHERS_REQUEST: "Boshqa foydalanuvchi zayavkasini o'chirib bo'lmaydi",
  CANNOT_APPROVE_NON_PENDING_REQUEST: "Bu zayavkani tasdiqlab bo'lmaydi",
  CANNOT_REJECT_NON_PENDING_REQUEST: "Bu zayavkani rad etib bo'lmaydi",
  CANNOT_APPROVE_NON_PENDING_DIRECTOR_REQUEST: "Bu zayavka direktor tasdig'ini kutmayapti",
  CANNOT_REJECT_NON_PENDING_DIRECTOR_REQUEST: "Bu zayavkani direktor rad eta olmaydi",
  CANNOT_FINALIZE_NOT_RECEIVED_REQUEST: "Faqat qabul qilingan zayavkani yakunlash mumkin",
  CANNOT_FULFILL_REQUEST: "Bu zayavkani bajarib bo'lmaydi",
  CANNOT_COLLECT_NOT_APPROVED_REQUEST: "Faqat tasdiqlangan zayavkani olish mumkin",
  CANNOT_DELIVER_NOT_IN_TRANSIT_REQUEST: "Bu zayavka yo'lda emas",
  CANNOT_RECEIVE_NOT_DELIVERED_REQUEST: "Bu zayavka hali yetkazilmagan",
  CANNOT_ASSIGN_DRIVER_NOT_APPROVED: "Tasdiqlanmagan zayavkaga haydovchi biriktirib bo'lmaydi",
  CANNOT_TRANSFER_TO_SAME_WAREHOUSE: "Bir omborga o'tkazib bo'lmaydi",
  CANNOT_CANCEL_NON_PENDING_TRANSFER: "Faqat kutilayotgan o'tkazmani bekor qilish mumkin",
  CANNOT_COMPLETE_NON_PENDING_TRANSFER: "Faqat kutilayotgan o'tkazmani yakunlash mumkin",
  CANNOT_DELETE_PROCESSED_ORDER: "Qayta ishlangan buyurtmani o'chirib bo'lmaydi",
  CANNOT_DELETE_SELF: "O'zingizni o'chira olmaysiz",
  NOT_ASSIGNED_DRIVER: "Siz bu zayavkaga biriktirilmagansiz",

  // Boshqa
  NO_DATA_FOUND: "Ma'lumot topilmadi",
  AI_NOT_CONFIGURED: "AI sozlanmagan",
};

/**
 * Translate a backend error (Error or raw code string) into Uzbek text.
 * Unknown codes fall back to a generic message.
 */
export function translateError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const code = raw.trim();
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  // Session-expired path from the API client
  if (code === "Session expired") return "Sessiya muddati tugagan, qayta kiring";
  // Generic network / unknown failure
  if (!code || code === "Request failed") return "Amalni bajarishda xatolik yuz berdi";
  // If it doesn't look like a code (has spaces/lowercase), show as-is
  if (/[a-z\s]/.test(code) && !/^[A-Z_]+$/.test(code)) return code;
  return "Amalni bajarishda xatolik yuz berdi";
}
