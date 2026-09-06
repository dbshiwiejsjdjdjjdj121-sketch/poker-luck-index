import { Account } from "@/components/account";
import { pageMeta } from "@/lib/site";
export const metadata=pageMeta("Account","Sign in to your ALL IN Poker Guide account with an email verification code.","/account",true);
export default function AccountPage(){return <main id="main" className="container page"><Account/></main>}
