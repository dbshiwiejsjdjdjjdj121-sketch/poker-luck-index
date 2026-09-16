import { ImageResponse } from "next/og";
export const alt = "ALL IN Poker Guide — Freerolls, live festivals and official sources.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",background:"#0a1425",color:"#f5f1e7",padding:76,justifyContent:"space-between"}}><div style={{display:"flex",color:"#dbbd78",fontSize:26,letterSpacing:6}}>ALL IN / POKER GUIDE</div><div style={{display:"flex",flexDirection:"column",fontSize:70,lineHeight:1.13}}><span>Find a freeroll.</span><span>Explore live festivals.</span><span style={{color:"#dbbd78"}}>Know before you go.</span></div><div style={{display:"flex",fontSize:22,color:"#a2b0c4"}}>CLEAR CONDITIONS · OFFICIAL SOURCES · TRAVEL GUIDES</div></div>,size);
}
