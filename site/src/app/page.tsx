import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import {Hero, HowItWorks } from "@/components/home-sections";
import GlareHover from "@/components/react-bits/GlareHover";
import { buttonVariants } from "@/components/ui/button";
import { catalog, scenes, widgets } from "@/lib/catalog";

export default function HomePage() {
  const items = catalog.items;
  const featured = items.filter((item) => item.featured);
  const hero = featured[0] ?? items[0];
  // 首屏舞台已经展示过 hero，网格给一张 4 张的完整目录，四列刚好铺满
  const showcase = items.slice(0, 4);


  return (
    <>
      {hero && <Hero hero={hero} items={items} />}

   

      <div className="pt-20">
        <HowItWorks />
      </div>

    </>
  );
}
