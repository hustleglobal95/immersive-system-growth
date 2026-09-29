import type { Metadata } from "next";
import { ZensiaImaginationExperience } from "@/src/experiences/zensia/ZensiaImaginationExperience";
import "./zensia-imagination.css";
import "./zensia-menu.css";

export const metadata: Metadata = {
  title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
  description: "Colombian specialty coffee, a room to stay, Zen at Home, Calm Club, online ordering and the Clayton café.",
  openGraph: {
    title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
    description: "Colombian specialty coffee, a room to stay, and Zensia's calm approach to the everyday coffee ritual.",
    siteName: "Zensia Coffee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
    description: "Colombian specialty coffee, a room to stay, and Zensia's calm approach to the everyday coffee ritual.",
  },
};

const zensiaJsonLd={
  "@context":"https://schema.org",
  "@graph":[
    {
      "@type":"CafeOrCoffeeShop",
      "@id":"https://www.zensiacoffee.com/#cafe",
      "name":"Zensia Coffee",
      "url":"https://www.zensiacoffee.com/",
      "description":"Colombian specialty coffee in Clayton, St. Louis.",
      "address":{
        "@type":"PostalAddress",
        "streetAddress":"8121 Maryland Avenue",
        "addressLocality":"Saint Louis",
        "addressRegion":"MO",
        "postalCode":"63105",
        "addressCountry":"US"
      }
    },
    {
      "@type":"WebPage",
      "name":"Zensia Coffee — Colombian Specialty Coffee in St. Louis",
      "about":{"@id":"https://www.zensiacoffee.com/#cafe"}
    }
  ]
};

export default function ZensiaPage(){
  return (
    <>
      <script
        id="zensia-discoverability-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html:JSON.stringify(zensiaJsonLd).replace(/</g,"\\u003c")}}
      />
      <ZensiaImaginationExperience />
    </>
  );
}
