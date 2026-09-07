import { Account } from "@/components/account";
import { pageMeta } from "@/lib/site";
import { festivals } from "@/lib/guide-data";
import { safeReturnPath } from "@/lib/saved-policy";
export const metadata=pageMeta("Account","Sign in to your ALL IN Poker Guide account with an email verification code.","/account",true);
export default async function AccountPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  const pending=typeof query.save==="string"?festivals.find(f=>f.id===query.save):undefined;
  const returnTo=safeReturnPath(typeof query.returnTo==="string"?query.returnTo:undefined);
  return <main id="main" className="container page"><Account key={`${pending?.id}:${returnTo}`} saveId={pending?.id} saveName={pending?.name} returnTo={returnTo}/></main>;
}
