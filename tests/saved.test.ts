import test from "node:test";
import assert from "node:assert/strict";
import { createSavedApi, type SavedStore } from "../src/lib/saved-api";
import { datesChanged, savedIsPast, safeReturnPath, savedSignInUrl, type SavedFestival } from "../src/lib/saved-policy";
import { festivals } from "../src/lib/guide-data";
const festival = festivals[0];
function setup() {
  const records = new Map<string, SavedFestival[]>();
  const store: SavedStore = {
    read: async uid => structuredClone(records.get(uid) || []),
    update: async (uid, apply) => { const entries = apply(structuredClone(records.get(uid) || [])); records.set(uid, entries); return entries; },
  };
  const api = createSavedApi({ verify: async token => {
    if (token === "expired") throw new Error("credential secret must never be exposed");
    return { uid: token, email_verified: token !== "anonymous" };
  }, store, festival: id => festivals.find(f => f.id === id), now: () => new Date("2026-09-07T17:00:00Z") });
  const request = (uid?: string, method = "GET", origin?: string) => new Request("https://www.allinpokerai.com/api/saved", { method, headers: { ...(uid ? { Authorization: `Bearer ${uid}` } : {}), ...(origin ? { Origin: origin } : {}) } });
  return { api, request, records };
}
test("saved API rejects anonymous, expired and missing sessions before any data access", async () => {
  const { api, request, records } = setup();
  for (const token of [undefined,"anonymous","expired"]) {
    const response = await api.save(request(token,"PUT"),festival.id);
    assert.equal(response.status,401);
    assert.doesNotMatch(await response.text(),/credential secret/);
  }
  assert.equal(records.size,0);
});
test("saved records are isolated by verified UID, not query or body parameters", async () => {
  const { api, request } = setup();
  await api.save(request("alice","PUT"),festival.id);
  const other=await api.list(new Request("https://www.allinpokerai.com/api/saved?uid=alice",{headers:{Authorization:"Bearer bob"}}));
  assert.deepEqual((await other.json()).entries,[]);
  await api.remove(request("bob","DELETE"),festival.id);
  assert.equal((await (await api.list(request("alice"))).json()).entries.length,1);
});
test("saving is idempotent, survives another client read, and supports remove and undo", async () => {
  const { api, request } = setup();
  const first = await (await api.save(request("alice","PUT"),festival.id)).json();
  const repeated = await (await api.save(request("alice","PUT"),festival.id)).json();
  assert.deepEqual(repeated,first);
  const reload = await api.list(request("alice"));
  assert.equal(reload.headers.get("cache-control"),"private, no-store");
  assert.equal(reload.headers.get("vary"),"Authorization");
  assert.deepEqual(await reload.json(),first);
  assert.deepEqual((await (await api.remove(request("alice","DELETE"),festival.id)).json()).entries,[]);
  assert.equal((await (await api.save(request("alice","PUT"),festival.id)).json()).entries.length,1);
});
test("invalid or unknown saves and cross-origin writes fail without altering existing saves", async () => {
  const { api, request } = setup();
  await api.save(request("alice","PUT"),festival.id);
  assert.equal((await api.save(request("alice","PUT"),"../bob")).status,400);
  assert.equal((await api.save(request("alice","PUT"),"missing-2026")).status,404);
  assert.equal((await api.remove(request("alice","DELETE","https://unrelated.example"),festival.id)).status,403);
  assert.equal((await (await api.list(request("alice"))).json()).entries.length,1);
});
test("a storage failure never reports a save as successful or exposes infrastructure errors", async () => {
  const api=createSavedApi({verify:async()=>({uid:"alice",email_verified:true}),festival:()=>festival,store:{read:async()=>{throw Error("database-key-secret")},update:async()=>{throw Error("database-key-secret")}}});
  const result=await api.save(new Request("https://example.com/api/saved",{method:"PUT",headers:{Authorization:"Bearer valid"}}),festival.id);
  assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/database-key-secret/);
});
test("same-origin saves survive Next.js internal URL reconstruction and HTTPS proxies", async () => {
  const { api } = setup();
  for (const [host, origin] of [["127.0.0.1:3018", "http://127.0.0.1:3018"], ["www.allinpokerai.com", "https://www.allinpokerai.com"]]) {
    const request = new Request("http://localhost:3018/api/saved", { method: "PUT", headers: { Authorization: "Bearer alice", Host: host, Origin: origin } });
    assert.equal((await api.save(request, festival.id)).status, 200);
  }
  const request = new Request("http://localhost:3018/api/saved", { method: "PUT", headers: { Authorization: "Bearer alice", Host: "www.allinpokerai.com", Origin: "https://attacker.example" } });
  assert.equal((await api.save(request, festival.id)).status, 403);
});
test("saved dates change only on an actual date change; past and cancelled editions remain classifiable", () => {
  const entry:SavedFestival={festivalId:festival.id,savedAt:"2026-09-01T00:00:00Z",datesWhenSaved:{startDate:festival.startDate,endDate:festival.endDate}};
  assert.equal(datesChanged(entry,{...festival,checkedAt:"2026-09-08T00:00:00Z"}),false);
  assert.equal(datesChanged(entry,{...festival,endDate:"2026-10-01"}),true);
  assert.equal(savedIsPast(festival,new Date("2027-01-01")),true);
  assert.equal(savedIsPast({...festival,status:"cancelled"},new Date("2027-01-01")),true);
  assert.equal(savedIsPast({...festival,status:"postponed"},new Date("2027-01-01")),false);
});
test("sign-in return targets stay on safe public guide routes and preserve filters", () => {
  for (const path of ["https://attacker.example","//attacker.example","/\\attacker.example","/api/auth","javascript:alert(1)","/account"]) assert.equal(safeReturnPath(path),"/saved");
  const target="/tournaments?brand=wpt&from=2026-09-01";
  assert.equal(safeReturnPath(target),target);
  const query=new URL(savedSignInUrl(festival.id,target),"https://www.allinpokerai.com").searchParams;
  assert.equal(query.get("save"),festival.id);assert.equal(query.get("returnTo"),target);
});
