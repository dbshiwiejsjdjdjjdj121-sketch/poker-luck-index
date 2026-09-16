import Link from "next/link";
import type { Freeroll } from "@/lib/guide-types";
import { entryLabel, freerollStale } from "@/lib/freerolls";
import { formatDate } from "@/lib/guide-utils";
export function FreerollCard({ item:f }: { item:Freeroll }) {
 return <article className="freeroll-card"><div className="fr-card-top"><span className="tour">{f.mode === "online" ? "ONLINE" : "LIVE · LOCAL"}</span><span className="fr-entry">{entryLabel(f)}</span></div><p className="card-location">{f.market.label}</p><h3><Link href={`/freerolls/${f.slug}`}>{f.title} <span aria-hidden="true">↗</span></Link></h3><p className="fr-description">{f.description}</p><dl><div><dt>REWARDS</dt><dd>{f.reward.label}</dd></div><div><dt>ENTRY CONDITIONS</dt><dd>{f.entry.costNote}</dd></div></dl><div className="fr-card-footer"><small>{freerollStale(f) ? "Recheck due · last checked " : "Source checked "}{formatDate(f.checkedAt.slice(0,10),true)}</small><Link className="text-link" href={`/freerolls/${f.slug}`}>Read guide ↗</Link></div></article>;
}
