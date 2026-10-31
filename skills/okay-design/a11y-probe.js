(() => {
  // Quick a11y probe: paste into a browser console / javascript tool, or run through `shoot.js --eval "$(cat a11y-probe.js)"`.
  // It finds cheap, objective failures only. It does not replace a keyboard pass or a contrast check on real colours.
  const q = (s) => [...document.querySelectorAll(s)];
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.title || '').trim();
  const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const heads = q('h1,h2,h3,h4,h5,h6').map((h) => +h.tagName[1]);
  const out = {
    width: innerWidth,
    htmlLang: !!document.documentElement.lang,
    h1Count: heads.filter((n) => n === 1).length,
    headingSkips: heads.some((n, i) => i && n > heads[i - 1] + 1),
    landmarks: ['main', 'nav', 'header', 'footer'].filter((t) => !q(`${t},[role=${t === 'header' ? 'banner' : t === 'footer' ? 'contentinfo' : t}]`).length),
    imgNoAlt: q('img:not([alt])').map(desc),
    buttonsNoName: q('button,[role=button],a[href]').filter((e) => visible(e) && !name(e) && !e.querySelector('img[alt]:not([alt=""])')).map(desc),
    inputsNoLabel: q('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea').filter((e) => visible(e) && !e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map(desc),
    targetsUnder24px: q('button,a[href],input,select,textarea,[role=button]').filter((e) => { if (!visible(e)) return false; const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(desc),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    zoomBlocked: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?(\s|,|$)/.test(document.querySelector('meta[name=viewport]')?.content || ''),
    reducedMotionRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media && /prefers-reduced-motion/.test(r.media.mediaText)); } catch { return false; } }),
  };
  return out;
})()
