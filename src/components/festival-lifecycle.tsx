import Link from "next/link";
import type { Festival } from "@/lib/guide-types";
import { dateRange } from "@/lib/guide-utils";
import { ExternalLink } from "./guide-ui";

export function FestivalLifecycleNotice({ festival, archived, next, previous }: {
  festival: Festival; archived: boolean; next?: Festival; previous?: Festival;
}) {
  return <>
    {archived && <aside className="notice archive-notice" aria-label="Past festival notice">
      <strong>This edition has ended.</strong>
      <p>{dateRange(festival.startDate, festival.endDate)}. This overview is kept for reference. Buy-ins, entry rules and festival-specific hotel offers belong to this edition and are not current booking or registration offers.</p>
      <p>{next ? <Link href={`/tournaments/${next.slug}`}>View the newer edition: {next.name} ↗</Link> : <Link href="/tournaments">Find upcoming & ongoing festivals ↗</Link>}</p>
    </aside>}
    {previous && <p className="edition-link">Previous edition: <Link href={`/tournaments/${previous.slug}`}>{previous.name} ↗</Link></p>}
  </>;
}

export function FestivalOfficialLinks({ festival: f, archived }: { festival: Festival; archived: boolean }) {
  return <section id="official" className="official-section">
    <div><p className="eyebrow">{archived ? "04 / ORIGINAL SOURCES" : "04 / TAKE THE NEXT STEP"}</p>
      <h2>{archived ? "Explore the official sources." : <>Interested? Go straight<br />to the source.</>}</h2>
      <p>{archived ? "These are the organizer links used for this edition. Pages may now describe another edition; check the year before using any schedule or registration option." : "Get the complete schedule, current rules and available registration options from the organizer."}</p>
    </div>
    <div className="official-links">
      <ExternalLink className="button" href={f.registrationUrl}>{archived ? "Organizer event page" : "Official event & registration"}</ExternalLink>
      <ExternalLink className="button button-outline" href={f.scheduleUrl}>{archived ? "Official schedule source" : "Full official schedule"}</ExternalLink>
      {f.venue.url && <ExternalLink className="text-link" href={f.venue.url}>Venue & visitor information</ExternalLink>}
      <small>{archived ? "This page is a historical overview. It does not offer entry to this ended edition." : "External websites may offer their own apps or require an account. Our account is separate."}</small>
    </div>
  </section>;
}
