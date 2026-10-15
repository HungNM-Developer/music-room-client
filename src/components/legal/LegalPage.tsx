import { Radio } from 'lucide-react';
import Link from 'next/link';

/** The address people write to about their data. Set NEXT_PUBLIC_CONTACT_EMAIL on Vercel. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'khanhnguyencoder1996@gmail.com';
export const UPDATED = '15/10/2026';

/** Plain reading layout for the privacy policy and the terms (linked from Google's consent screen). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[68ch] px-4 py-10 sm:py-14">
      <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-amber">
        <Radio className="h-5 w-5" aria-hidden /> Music Room
      </Link>
      <h1 className="type-display mt-6 text-[clamp(32px,6vw,48px)] font-extrabold leading-[1.05]">{title}</h1>
      <p className="mt-2 text-[14px] text-sage">Cập nhật lần cuối: {UPDATED}</p>
      <div className="mt-8 space-y-5 leading-relaxed text-paper/90 [&_a]:text-amber [&_a]:underline [&_a]:underline-offset-2 [&_h2]:type-display [&_h2]:pt-4 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:text-paper [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-12 flex gap-4 text-[14px] text-sage">
        <Link href="/privacy" className="hover:text-paper">
          Quyền riêng tư
        </Link>
        <Link href="/terms" className="hover:text-paper">
          Điều khoản
        </Link>
        <Link href="/" className="hover:text-paper">
          Trang chủ
        </Link>
      </p>
    </main>
  );
}
