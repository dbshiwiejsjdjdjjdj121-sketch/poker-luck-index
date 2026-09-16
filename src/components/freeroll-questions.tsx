import Link from "next/link";
import { ExternalLink } from "@/components/guide-ui";

export function FreerollQuestions() {
  return <section className="fr-questions" aria-labelledby="freeroll-questions-title">
    <p className="eyebrow">BEFORE YOU CHOOSE A GAME</p>
    <h2 id="freeroll-questions-title">Poker freerolls: common questions</h2>
    <div className="fr-question-grid">
      <article>
        <h3>What is a poker freeroll?</h3>
        <p>A freeroll is a poker tournament with no entry buy-in. Entry may still depend on a qualifying ticket, a password or account eligibility. Read the conditions for the specific tournament.</p>
        <ExternalLink href="https://www.pokerstars.com/is/help/articles/finding-freerolls-fr/10918/?ooac=1">PokerStars explains freeroll entry</ExternalLink>
      </article>
      <article>
        <h3>Can I enter without making a deposit?</h3>
        <p>Some programs require no deposit; others are limited to funded accounts. Use the no-deposit filter, then check the guide’s country and ticket requirements. Free entry alone does not establish no-deposit eligibility.</p>
        <Link href="/freerolls?entry=no-deposit">See programs with no deposit required ↗</Link>
      </article>
      <article>
        <h3>Do free poker tournaments award real money?</h3>
        <p>Some award cash; others award tournament credit, tickets or venue prizes. Each guide identifies the published reward. A promotional weekly total is not the prize pool for every tournament, and a ticket is not cash.</p>
        <Link href="/freerolls/pokerstars-freerolls">Compare cash and tournament-money finals ↗</Link>
      </article>
      <article>
        <h3>How do I find freerolls running today?</h3>
        <p>Choose “Today” for confirmed dated starts in the venue’s local time. We exclude dates whose source check is over 48 hours old. Recurring online programs without a confirmed date remain in the main directory; check their official lobby.</p>
        <Link href="/freerolls?when=today">See confirmed starts today ↗</Link>
      </article>
      <article>
        <h3>Which freerolls can I enter from the US or UK?</h3>
        <p>Select your country and, for US listings, your state. Read the specific program’s location and account rules. An operator’s offer in one country does not establish availability elsewhere; an empty result means we have no verified match.</p>
        <Link href="/about">How we check regional availability ↗</Link>
      </article>
      <article>
        <h3>Where do I find a password or register?</h3>
        <p>Open the official links at the bottom of the program guide. Follow the organizer’s published instructions for a ticket, password or registration. ALL IN Poker Guide provides information; entry is handled by the organizer.</p>
        <ExternalLink href="https://www.pokerstars.com/is/help/articles/finding-freerolls-fr/10918/?ooac=1">Official lobby and password guidance</ExternalLink>
      </article>
    </div>
  </section>;
}
