// progression.js

// ---------- Program-level constants ----------

const PROGRAM = {
  numBlocks: 5,           // five formula-generated 4-week blocks (blocks 1-5, weeks 1-20)
                          // block 6 (weeks 21-24) is explicit config in SPECIAL_WEEKS
  activeWeeksPerBlock: 3, // weeks 1-3 of each block are progressive training
                          // week 4 of each block is a rest/deload week (lower sets & reps)
  setJumpAtBlock: 3,      // MACRO PERIODIZATION: sets increase going into block 3.
                          //   blocks 1-2 → initialSets (lower volume phase)
                          //   blocks 3-5 → peakSets   (higher volume phase)
                          // 1-indexed. when sets increase, startReps resets to absorb the load.
  restFraction: 0.58,     // rest week reps = Math.round(blockPeakReps * restFraction)
                          // ~58% of peak keeps the rest week genuinely easy while
                          // maintaining movement pattern.
};

// ---------- Exercise config ----------

const EXERCISES = {
  // Formula exercises: startReps is computed from the formula.
  //
  //   increment:       reps added per active week within any block (MICRO periodization unit).
  //   transitionBonus: extra reps added when starting a new block at the SAME set level.
  //     pu = 1: after a rest week you pick up one rep ahead of where you peaked —
  //             the rest paid off, you're slightly stronger.
  //     pl = 0: pull-ups are harder to recover from; prudent to re-enter at the same
  //             rep count you peaked at rather than advancing.
  //   initialSets / peakSets: set count for the low-volume and high-volume phases.
  //   restSets: sets used on the rest week (always lower than active sets).
  pu: { name: "Push-ups", day: "mon", dayName: "Push", restPeriod: "90 seconds",
        initialReps: 10, increment: 1, transitionBonus: 1,
        initialSets: 6, peakSets: 7, restSets: 4 },
  pl: { name: "Pull-ups", day: "wed", dayName: "Pull", restPeriod: "2 minutes",
        initialReps: 5,  increment: 1, transitionBonus: 0,
        initialSets: 6, peakSets: 7, restSets: 4 },

  // Config exercises: blockStartReps is stored explicitly because inter-block
  // transitions don't follow a single rule.
  //
  //   sq — blockStartReps: [15, 22, 22, 26, 30]
  //     block 1→2: +2 bonus (early phase, lower volume → aggressive rep jump at transition)
  //     block 2→3: MACRO RESET back to 22 (sets jump 6→7; reps pulled back to absorb volume)
  //     block 3→4 and 4→5: +0 (high-volume phase — just continue from previous peak)
  //
  //   cr — blockStartReps: [15, 20, 22, 25, 28]
  //     no set jump (sets always = 3); progression slows each block intentionally because
  //     crunches are an accessory lift — you don't chase infinite reps indefinitely.
  //
  //   increment: within any block, reps still advance by this much each week.
  sq: { name: "Squats",   day: "fri", dayName: "Legs", restPeriod: "90 seconds",
        blockStartReps: [15, 22, 22, 26, 30], increment: 2,
        initialSets: 6, peakSets: 7, restSets: 4 },
  cr: { name: "Crunches", day: null,  dayName: null,   restPeriod: "60 seconds",
        blockStartReps: [15, 20, 22, 25, 28], increment: 2,
        sets: 3,      // constant throughout — no volume phase jump for crunches
        restSets: 2 },
};

// ---------- Block 6: explicit special weeks (formula does not apply) ----------

const SPECIAL_WEEKS = [
  { wk: 21, pu: [4, 10], pl: [4, 5],  sq: [4, 15], cr: [2, 15], label: "Full deload" },
  { wk: 22, test: true,                                            label: "TEST WEEK"  }, // no exercise prescription — UI renders test prompts instead
  { wk: 23, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
  { wk: 24, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
];

// ---------- Formula functions ----------

function computeBlockSets(ex, blockIdx) {
  if (ex.sets !== undefined) return ex.sets;
  // setJumpAtBlock is 1-indexed; blockIdx is 0-indexed
  return blockIdx + 1 < PROGRAM.setJumpAtBlock ? ex.initialSets : ex.peakSets;
}

function computeStartReps(ex, blockIdx) {
  if (ex.blockStartReps) return ex.blockStartReps[blockIdx];
  if (blockIdx === 0) return ex.initialReps;
  const prevSets  = computeBlockSets(ex, blockIdx - 1);
  const currSets  = computeBlockSets(ex, blockIdx);
  const prevStart = computeStartReps(ex, blockIdx - 1);
  const prevEnd   = prevStart + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  if (currSets > prevSets) {
    // MACRO RESET: sets increased — reps drop back to where the previous block *started*
    // (not where it peaked) to compensate for the higher volume load.
    return prevStart;
  }
  // MICRO CONTINUATION: same set level — carry forward from previous block's peak,
  // plus transitionBonus (may be 0).
  return prevEnd + ex.transitionBonus;
}

function weekReps(ex, blockIdx, weekInBlock) {
  return computeStartReps(ex, blockIdx) + weekInBlock * ex.increment;
}

function restReps(ex, blockIdx) {
  const peak = computeStartReps(ex, blockIdx) + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  // Rest week targets ~58% of peak — easy enough for recovery while keeping the pattern.
  return Math.round(peak * PROGRAM.restFraction);
}

function generatePlan() {
  const plan = [];
  for (let b = 0; b < PROGRAM.numBlocks; b++) {
    const baseWeek = b * 4;
    for (let w = 0; w < PROGRAM.activeWeeksPerBlock; w++) {
      const entry = { wk: baseWeek + w + 1, label: null };
      for (const [key, ex] of Object.entries(EXERCISES)) {
        entry[key] = [computeBlockSets(ex, b), weekReps(ex, b, w)];
      }
      plan.push(entry);
    }
    // 1 rest week — block 3 (0-indexed: b=2) gets the mid-test label
    const isBlockThree = (b === PROGRAM.setJumpAtBlock - 1);
    const restEntry = {
      wk: baseWeek + 4,
      label: isBlockThree ? "Rest + mid-test" : "Rest week",
    };
    for (const [key, ex] of Object.entries(EXERCISES)) {
      restEntry[key] = [ex.restSets, restReps(ex, b)];
    }
    plan.push(restEntry);
  }
  // Block 6: deload, test week, maintain ×2 — kept explicit, no formula applies
  plan.push(...SPECIAL_WEEKS);
  return plan;
}

// ---------- Dual export: browser (global) + Node.js (require) ----------
if (typeof module !== "undefined") {
  module.exports = { PROGRAM, EXERCISES, SPECIAL_WEEKS,
                     computeBlockSets, computeStartReps, weekReps, restReps, generatePlan };
}
