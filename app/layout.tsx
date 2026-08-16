import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./enhancements.css";

const sans = Noto_Sans_TC({ variable:"--font-sans", subsets:["latin"], display:"swap" });
const serif = Noto_Serif_TC({ variable:"--font-serif", subsets:["latin"], display:"swap" });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "forum.example.org";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const image = new URL("/og.png", base).toString();
  return {
    metadataBase: base,
    title: { default:"2026年保險業風險管理趨勢論壇", template:"%s｜保險業風險管理趨勢論壇" },
    description: "持續關注保險業風險管理、資本策略、制度發展與產業變革的年度專業論壇。",
    openGraph:{title:"2026年保險業風險管理趨勢論壇",description:"新紀元：價值導向之風險管理與資本策略",type:"website",locale:"zh_TW",images:[{url:image,width:1731,height:909,alt:"2026年保險業風險管理趨勢論壇－11月16日晶華酒店"}]},
    twitter:{card:"summary_large_image",title:"2026年保險業風險管理趨勢論壇",description:"持續對話，與產業共同前行",images:[image]},
    robots:{index:false,follow:true},
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${sans.variable} ${serif.variable}`}>
        {children}
      </body>
    </html>
  );
}
