import QRCode from "qrcode";
import type { Party } from "@prisma/client";
import { db } from "@/lib/db";
import { applyLicenseAction, payLicenseAction } from "@/app/actions/party";
import { formatDate } from "@/lib/dates";
import { LICENSE_STATES, PARTY_KINDS, type PartyKind } from "@/lib/domain";
import { vatOn } from "@/lib/money";
import { absoluteUrl } from "@/lib/url";
import { Card, EmptyState, Field, Money, PendingRule, StatusPill, TableWrap } from "./ui";

/** تراخيص الأطراف وطلب ترخيص جديد (المواد 9 إلى 21). يُستعمل في لوحات الشاعر والمنظّم والموقع. */
export async function LicensePanel({ parties, returnTo }: { parties: Party[]; returnTo: string }) {
  const ids = parties.map((p) => p.id);
  const [licenses, types] = await Promise.all([
    db.license.findMany({ where: { OR: [{ partyId: { in: ids } }, { paidByPartyId: { in: ids } }] }, include: { type: true, party: true }, orderBy: { createdAt: "desc" } }),
    db.licenseType.findMany({ where: { partyKind: { in: parties.map((p) => p.kind) }, code: { notIn: ["POET_NONCONT", "EVENT"] } }, orderBy: { feeHalala: "desc" } }),
  ]);
  const qrs = new Map<string, string>();
  for (const l of licenses.filter((x) => x.status === "ACTIVE")) qrs.set(l.id, await QRCode.toDataURL(absoluteUrl(`/verify/${l.verifyCode}`), { margin: 1, width: 72 }));

  return (
    <div className="space-y-6">
      <Card title="التراخيص">
        {licenses.length === 0 ? (
          <EmptyState title="لا تراخيص بعد" body="الترخيص الساري شرط لاستقبال العروض والتعاقد (المادة 9). اطلب ترخيصك من النموذج أدناه." />
        ) : (
          <TableWrap>
            <thead><tr><th>الترخيص</th><th>الرقم</th><th>الحالة</th><th>الرسم</th><th>السريان</th><th></th></tr></thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td className="font-semibold text-green-900">
                    {l.type.nameAr}
                    <div className="text-xs font-normal text-ink-500">{l.party.displayName}{l.scopeEventId ? " · مقيّد بفعالية" : ""}{l.paidByPartyId && !ids.includes(l.partyId) ? " · دفعته عن الطرف" : ""}</div>
                    {l.reviewNote ? <div className="mt-1 text-xs font-normal text-ink-600">ملاحظة: {l.reviewNote}</div> : null}
                  </td>
                  <td className="tabular whitespace-nowrap" dir="ltr">{l.number}</td>
                  <td><StatusPill map={LICENSE_STATES} state={l.status} /></td>
                  <td><Money halala={l.feeHalala} vat={l.vatHalala} /></td>
                  <td className="whitespace-nowrap text-xs">{l.issuedAt ? `${formatDate(l.issuedAt)}` : "–"}<br />{l.expiresAt ? `حتى ${formatDate(l.expiresAt)}` : ""}</td>
                  <td>
                    {l.status === "AWAITING_PAYMENT" ? (
                      <form action={payLicenseAction}>
                        <input type="hidden" name="licenseId" value={l.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="btn-primary btn-sm">دفع وإصدار</button>
                      </form>
                    ) : qrs.get(l.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrs.get(l.id)} alt={`رمز التحقق من الترخيص ${l.number}`} width={56} height={56} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <p className="mt-3 text-xs text-ink-500">بوابة الدفع لم تُربط بعد: «دفع وإصدار» يقيّد الرسم والضريبة في الدفتر لتجربة الرحلة.</p>
      </Card>

      <Card title="طلب ترخيص جديد">
        {types.length === 0 ? <EmptyState title="لا تراخيص متاحة لصفاتك" /> : (
          <form action={applyLicenseAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <Field label="الصفة">
              <select name="partyId" className="input">
                {parties.map((p) => <option key={p.id} value={p.id}>{PARTY_KINDS[p.kind as PartyKind]} · {p.displayName}</option>)}
              </select>
            </Field>
            <Field label="نوع الترخيص">
              <select name="typeCode" className="input">
                {types.map((t) => <option key={t.code} value={t.code}>{t.nameAr} · {(t.feeHalala / 100).toLocaleString("en-US")} ر.س + {(vatOn(t.feeHalala) / 100).toLocaleString("en-US")} ضريبة</option>)}
              </select>
            </Field>
            <Field label="رقم وثيقة العمل الحر" hint="للتراخيص الإعلامية الفردية فقط (المادتان 17 و19)">
              <input name="freelanceNumber" className="input tabular" dir="ltr" />
            </Field>
            <Field label="تاريخ انتهاء الوثيقة"><input name="freelanceExpiry" type="date" className="input" /></Field>
            {types.some((t) => t.pendingQuestion) ? (
              <div className="md:col-span-2"><PendingRule>بعض بنود هذه التراخيص (المدة أو الدافع) قيد الحسم مع صاحب المبادرة</PendingRule></div>
            ) : null}
            <div className="md:col-span-2"><button className="btn-primary">تقديم الطلب</button></div>
          </form>
        )}
      </Card>
    </div>
  );
}
