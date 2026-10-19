import { db } from "./db";

// سجل النشاط: إضافة فقط. لا تحديث ولا حذف في أي موضع من الشجرة (يحرسه tests/audit-append-only.test.ts).
export async function audit(entry: {
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  detail?: Record<string, unknown> | string;
}) {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      detail: typeof entry.detail === "string" ? entry.detail : entry.detail ? JSON.stringify(entry.detail) : null,
    },
  });
}

export async function notify(userId: string, title: string, body: string, link?: string) {
  await db.notification.create({ data: { userId, title, body, link } });
}
