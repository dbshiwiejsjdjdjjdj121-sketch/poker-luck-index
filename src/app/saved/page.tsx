import { SavedList } from "@/components/saved-list";
import { festivals,destinations } from "@/lib/guide-data";
import { pageMeta } from "@/lib/site";
export const metadata=pageMeta("Saved festivals","Your private shortlist of poker festivals, with current dates, buy-ins and official entry points.","/saved",true);
export default function SavedPage(){return <main id="main" className="container page"><div className="page-heading"><p className="eyebrow">YOUR NEXT STOPS</p><h1>Saved festivals.</h1><p>A few possibilities. One place to plan.</p></div><SavedList festivals={festivals} destinations={destinations}/></main>;}
