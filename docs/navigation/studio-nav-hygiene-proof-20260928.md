# Studio nav hygiene proof (2026-09-28)

Branch `fix/studio-nav-hygiene-20260928` is based on `main e944ed554897ddb0d7686b38312c7e28083a3e71`.

The source-main `npm run verify:chef-nav` audit failed on seven advertised routes without pages: `/studio`, `/studio/analytics`, `/studio/branding`, `/studio/domain`, `/studio/media`, `/studio/pages`, and `/studio/seo`. The branch sets `hidden: true` on the existing Studio parent item in `components/navigation/nav-config.tsx`. It retains the future Studio configuration and creates no placeholder page.

The same audit then passed (exit 0): 462 visible unique nav hrefs and 505 discoverable static routes covered. Both desktop and mobile chef nav renderers already filter hidden items. The existing `app/(chef)/reputation/studio/page.tsx` route is present and untouched.

Focused `nav-regression.test.ts` and `chef-nav-priority.test.ts` runs on base and changed worktrees produced the same seven pre-existing assertion failures about action bar, bottom links and nav shape; there is no changed failure signature from this one-line edit. Those tests remain a separate nav contract repair. Full release and live UI verification remain pending other gates; no deployment occurred.
