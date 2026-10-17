'use client';

import { useEffect } from 'react';
import { adoptLangFromUrl, useLang } from './lang';

/** Mounted once in the root layout: takes `?lang` from a shared link and keeps `<html lang>` in step. */
export function LangRuntime() {
  const lang = useLang();
  useEffect(() => adoptLangFromUrl(window.location.search), []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
