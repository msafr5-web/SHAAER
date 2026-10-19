import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { addRowMemberAction } from "@/app/actions/party";
import { LICENSE_STATES } from "@/lib/domain";
import { Card, EmptyState, Field, Flash, PageTitle, PendingRule, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "صفي" };

export default async function RowPage({ searchParams }: { searchParams: SearchParams }) {
  const { parties } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  const leader = parties.find((p) => p.kind === "ROW_LEADER");
  const member = parties.find((p) => p.kind === "ROW_MEMBER");
  const row = leader
    ? await db.row.findFirst({ where: { leaderId: leader.id }, include: { members: { include: { licenses: true } } } })
    : member?.rowId ? await db.row.findUnique({ where: { id: member.rowId }, include: { members: { include: { licenses: true } }, leader: true } }) : null;

  return (
    <>
      <PageTitle title={row?.name ?? "الصف"} subtitle="قائد الصف ينظّم الأعضاء ويضمن حضورهم، والغرامة فردية على المتسبب ولا تقع على الصف كاملاً إلا بتقصير جماعي (المواد 13 و41 و45)." />
      <Flash ok={ok} error={error} />
      <div className="mb-6"><PendingRule question="ج4">الحد الأدنى لعدد أعضاء الصف غير محدد في اللائحة</PendingRule></div>
      {!leader && !member ? <EmptyState title="لست قائد صف ولا عضواً فيه" body="أضف صفة «قائد صف» من صفحة لوحاتي إن كنت تقود صفاً." /> : null}
      {row ? (
        <Card title={`الأعضاء (${row.members.length})`}>
          <TableWrap>
            <thead><tr><th>العضو</th><th>المدينة</th><th>ترخيص عضو الصف (المادة 12)</th></tr></thead>
            <tbody>
              {row.members.map((m) => {
                const l = m.licenses.find((x) => x.typeCode === "ROW_MEMBER");
                return <tr key={m.id}><td>{m.displayName}</td><td>{m.city}</td><td>{l ? <StatusPill map={LICENSE_STATES} state={l.status} /> : <span className="text-xs text-danger-700">لا ترخيص</span>}</td></tr>;
              })}
            </tbody>
          </TableWrap>
        </Card>
      ) : null}
      {leader ? (
        <Card title="إضافة عضو" className="mt-6">
          <form action={addRowMemberAction} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="partyId" value={leader.id} />
            {!row ? <Field label="اسم الصف"><input name="rowName" className="input" /></Field> : null}
            <Field label="اسم العضو"><input name="name" required className="input" /></Field>
            <Field label="بريده الإلكتروني"><input name="email" type="email" required className="input" dir="ltr" /></Field>
            <div className="flex items-end"><button className="btn-primary w-full">إضافة</button></div>
          </form>
        </Card>
      ) : null}
    </>
  );
}
