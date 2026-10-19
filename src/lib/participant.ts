import "server-only";
import { requireParty } from "./auth";
import type { PartyKind } from "./domain";

// صفات الأطراف المشاركة في الفعاليات: لوحة واحدة للشاعر وقائد الصف وعضوه والمقيّم واللجان والإعلام.
export const PARTICIPANT_KINDS: PartyKind[] = [
  "POET", "ROW_LEADER", "ROW_MEMBER", "EVALUATOR", "COMMITTEE", "CRITIC", "MEDIA_CHANNEL", "PHOTOGRAPHY", "BROADCAST",
];

export async function requireParticipant() {
  const { user, party } = await requireParty(PARTICIPANT_KINDS);
  const parties = user.parties.filter((p) => PARTICIPANT_KINDS.includes(p.kind as PartyKind));
  return { user, party, parties, ids: parties.map((p) => p.id) };
}
