# Warhammer 40,000 11th Edition data

The pipe-delimited export tables in this directory are combined into the browser-ready
`public/data/wh40k11e.json` ruleset by running:

```powershell
npm run build:11e
```

The ruleset is presented as 11th Edition per the intended use of this supplied dataset.
Source fields (including the original edition values in `Source.csv`) are retained without
rewriting; some rules may carry over from earlier editions.

The War Codex viewer's Stratagems tab supports faction, detachment, and name filters.
Selecting a detachment retains general stratagems (those without a detachment ID).
Changing faction resets the detachment filter. Results are grouped into collapsible
phase sections in turn order, with Any phase listed separately; multi-phase stratagems
appear in each applicable phase.
