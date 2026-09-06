export type EmailCodeRecord={codeHash:string;createdAt:string;email:string;expiresAt:string;failedAttempts:number;resendAvailableAt:string};
export const EMAIL_CODE_TTL_MS=10*60*1000;
export const EMAIL_CODE_RESEND_COOLDOWN_MS=45*1000;
export const EMAIL_CODE_MAX_FAILED_ATTEMPTS=5;
export function checkResend(record:Partial<EmailCodeRecord>|null,now:number){
  const until=Date.parse(record?.resendAvailableAt||"");
  return Number.isFinite(until)&&until>now?`Please wait ${Math.ceil((until-now)/1000)}s before requesting another code.`:null;
}
export function advanceCodeAttempt(record:Partial<EmailCodeRecord>|null,submittedHash:string,now:number):{error:string|null;next:Partial<EmailCodeRecord>|null}{
  if(!record)return{error:"Request a fresh verification code before continuing.",next:null};
  const expiry=Date.parse(record.expiresAt||"");
  if(!Number.isFinite(expiry)||expiry<=now)return{error:"This verification code has expired. Request a fresh one.",next:null};
  const failed=Number(record.failedAttempts||0);
  if(failed>=EMAIL_CODE_MAX_FAILED_ATTEMPTS)return{error:"Too many incorrect codes. Request a new one and try again.",next:null};
  if(submittedHash!==record.codeHash){const count=failed+1;return{error:count>=EMAIL_CODE_MAX_FAILED_ATTEMPTS?"Too many incorrect codes. Request a new one and try again.":"That code is incorrect. Try again.",next:count>=EMAIL_CODE_MAX_FAILED_ATTEMPTS?null:{...record,failedAttempts:count}};}
  return{error:null,next:null};
}
