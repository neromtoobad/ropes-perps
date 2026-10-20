# The Crag v2: direction (Oct 20)

**Problem:** v1 put 44 climbers at random x positions, with a rope each from the top of the wall and a tag on a dozen of them. It read as noise.

**References:**
- **DeepBook** (deepbook.xyz): one framed plot area, y-axis labels right-aligned in small mono, near-invisible gridlines, one accent per series, and a value badge only on the live point.
- **Swimlane / beeswarm charts** (Awwwards data-visualization category): one lane per category; points inside a lane spread just enough not to collide.

**Principles kept, signature pieces not copied.**

**ROPES's own metaphor: fixed lines.** A crag has fixed ropes and climbers clip onto them.
- One rope per market lane in the "all" view.
- In the single-market view, the two lanes are LONGS and SHORTS.
- Climbers hang on their market's rope at the height of their return. When two would collide, they alternate sides of the rope (a beeswarm on one axis).

**Tokens.** Unchanged brand: Russo One / Chakra Petch, slate violet `#0d0a1c`, up `#00e58a`, down `#ff2f52`, gold `#ffc94d`.
- Plot gridlines `#ffffff0d`. Break-even is gold dashed at 0.55 opacity.
- The y-axis is labelled on the right, 9px mono at 0.2em tracking.
- Lane bands alternate `#ffffff04` / transparent, with a 1px `#ffffff08` divider.
- Climber sprite is 52px (ROPES players 64px with a gold glow).

**Hierarchy, one accent at a time:**
- Tags show only for the top climber of each lane, a ROPES player, the selected climber or the hovered one.
- Each lane footer shows the market, mark, ▲ longs and ▼ shorts.

**Motion is calm:**
- Height eases over 1.2s.
- No per-climber dangling while still; the slight sway is kept only for the selected climber.
- Liquidations still fall, from their own lane.
