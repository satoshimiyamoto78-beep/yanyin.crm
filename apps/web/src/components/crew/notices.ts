import { ChefHat, Armchair, Award, Ban, Bell, BellRing, CalendarCheck, Check, CheckCheck, Coffee, CookingPot, CreditCard, DoorOpen, LifeBuoy, LogOut, MapPin, Pencil, Printer, ReceiptText, ScanLine, Send, Trash2, Trophy, UserRound, type LucideIcon } from "lucide-react";

/**
 * Icon and colour for a waiter notification, read from its title. Each kind of
 * event gets its own icon, so the island says what happened at a glance.
 */
const NOTICE_RULES: [RegExp, LucideIcon, "blue" | "green" | "orange"][] = [
  [/cancel|отмен|hủy/i, Ban, "orange"],
  [/remov|удал|xóa/i, Trash2, "orange"],
  [/closed|paid|payment|оплат|закрыт|thanh toán|đã đóng/i, CreditCard, "green"],
  [/check|bill|счёт|счет|чек|hóa đơn|tính tiền/i, ReceiptText, "orange"],
  [/all served/i, CheckCheck, "green"],
  [/served|подан|lên món/i, Check, "green"],
  [/ready|готово|xong/i, ChefHat, "green"],
  [/cooking|готов|nấu/i, CookingPot, "blue"],
  [/sent to the kitchen|отправлен на кухню|gửi bếp/i, Send, "green"],
  [/kitchen|кухн|bếp/i, BellRing, "blue"],
  [/seated|сел|ngồi/i, Armchair, "green"],
  [/scanned|скан|quét/i, ScanLine, "blue"],
  [/booking|брон|đặt bàn/i, CalendarCheck, "green"],
  [/xp|quest|квест|nhiệm vụ/i, Trophy, "green"],
  [/badge|бейдж|huy hiệu/i, Award, "green"],
  [/break|перерыв|nghỉ/i, Coffee, "blue"],
  [/shift|смен|ca /i, DoorOpen, "blue"],
  [/print|принтер|печат|máy in|in trang/i, Printer, "blue"],
  [/profile|профил|hồ sơ/i, UserRound, "green"],
  [/zone|зона|khu/i, MapPin, "blue"],
  [/support|поддержк|hỗ trợ/i, LifeBuoy, "blue"],
  [/signed out|вышли|đăng xuất/i, LogOut, "blue"],
  [/×|qty|updated|обновл|cập nhật/i, Pencil, "blue"],
  [/alert|уведомл|thông báo/i, Bell, "blue"],
];
export function noticeMeta(title: string): { icon: LucideIcon; tone: "blue" | "green" | "orange" } {
  const hit = NOTICE_RULES.find(([re]) => re.test(title));
  return hit ? { icon: hit[1], tone: hit[2] } : { icon: Bell, tone: "blue" };
}
