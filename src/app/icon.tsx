import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",background:"#0a1425",color:"#dbbd78",fontSize:38,fontWeight:700,alignItems:"center",justifyContent:"center",borderRadius:14}}>A</div>,size);
}
