'use client';

import { Radio } from 'lucide-react';
import Link from 'next/link';
import { AccountPanel } from '@/components/account/AccountPanel';
import { HomeForm } from '@/components/home/HomeForm';
import { HomeScenery } from '@/components/home/scenery/HomeScenery';
import { HeroDial } from '@/components/room/TuningDial';
import { LangSwitch } from '@/components/ui/LangSwitch';
import { useT } from '@/i18n';

export default function HomePage() {
  const t = useT();
  return (
    <main className="flex min-h-dvh items-center px-4 py-10 sm:py-14">
      <HomeScenery />
      {/* Phones: headline → form → how it works. Desktop: copy on the left, form on the right.
          HomeScenery puts the tree and the moon in the free space beside `data-scenery`. */}
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-0">
        <div className="min-w-0 lg:self-end">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-amber">
            <Radio className="h-5 w-5" aria-hidden /> {t.appName}
          </p>
          <h1 className="type-display mt-5 max-w-[15ch] text-balance text-[clamp(44px,7.5vw,88px)] font-extrabold leading-[0.95]">
            {t.home.headline}
          </h1>
          <p className="mt-5 max-w-md text-[17px] text-sage">{t.appTagline}</p>
        </div>

        <div
          data-scenery="panel"
          className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
        >
          <HomeForm />
          <AccountPanel />
        </div>

        <div data-scenery="text" className="min-w-0 lg:pt-10">
          <div className="max-w-xl">
            <HeroDial />
          </div>
          <ol className="mt-8 max-w-xl space-y-3">
            {t.home.steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="type-display w-5 shrink-0 text-[20px] font-bold leading-6 text-amber">{i + 1}</span>
                <span className="text-paper/90">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-4 text-[13px] text-sage">
            <Link href="/privacy" className="hover:text-paper">
              {t.legal.privacy}
            </Link>
            <Link href="/terms" className="hover:text-paper">
              {t.legal.terms}
            </Link>
            <LangSwitch className="ml-auto" />
          </div>
        </div>

        {/* Phones and tablets: an empty stretch of meadow at the very bottom, so the toys hidden
            in the grass (guitar, train) can be reached there. */}
        <div aria-hidden className="h-[40vh] lg:hidden" />
      </div>
    </main>
  );
}
