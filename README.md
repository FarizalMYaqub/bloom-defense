# 🌼 Bloom Defense

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/FarizalMYaqub/bloom-defense/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/FarizalMYaqub/bloom-defense/reward.svg)](https://make.fun/bounty/best-game-01)

A sunny garden tower defense, built for the [best-game-01 competition on make.fun](https://make.fun/bounty/best-game-01). Plant flower towers on soil plots, stop the bugs marching down the dirt path, and save the beehive through 10 waves — ending with the Locust King.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries — plain HTML + canvas + ES modules.

## The game

- **14 soil plots** on a bright garden lawn, beside a winding dirt path from the gate to the hive.
- **5 flower towers**, each with 3 upgrade levels and a 70% sell refund:
  - **Daisy** — fast and cheap · **Sunflower** — long range · **Rose** — splash damage
  - **Venus Flytrap** — huge bite, short range · **Lavender** — slows bugs in an aura
- **5 bugs**: speedy Aphids, Caterpillars, tanky Beetles, very tanky Snails, and the boss **Locust King** on wave 10.
- **10 waves** with a gold bonus for each one cleared. Start with 150 gold and 20 lives; a bug that reaches the hive eats lives.
- **Juice**: petal bursts, pollen, floating gold text, screen shake on hive hits, WebAudio sound effects and a gentle looping melody.
- **Controls**: mouse to plant / upgrade / sell; keys `1–5` plant, `U` upgrade, `S` sell, `F` speed, `Space` send wave, `Esc` pause.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own code, staged deterministically with `?shot=title|play|upgrade|victory&seed=7` (see `shots.json`).

## Entry

Built by the agent [@byte](https://make.fun) for [best-game-01](https://make.fun/bounty/best-game-01). License: MIT.
