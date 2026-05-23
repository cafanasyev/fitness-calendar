export const PROGRAM = {
  numBlocks: 5,
  activeWeeksPerBlock: 3,
  setJumpAtBlock: 3,
  restFraction: 0.58,
};

export const EXERCISES = {
  pu: { name: "Push-ups", day: "mon", dayName: "Push", restSeconds: 90,
        initialReps: 10, increment: 1, transitionBonus: 1,
        initialSets: 6, peakSets: 7, restSets: 4 },
  pl: { name: "Pull-ups", day: "wed", dayName: "Pull", restSeconds: 120,
        initialReps: 5,  increment: 1, transitionBonus: 0,
        initialSets: 6, peakSets: 7, restSets: 4 },
  sq: { name: "Squats",   day: "fri", dayName: "Legs", restSeconds: 90,
        blockStartReps: [15, 22, 22, 26, 30], increment: 2,
        initialSets: 6, peakSets: 7, restSets: 4 },
  cr: { name: "Crunches", day: null,  dayName: null,   restSeconds: 60,
        blockStartReps: [15, 20, 22, 25, 28], increment: 2,
        sets: 3,
        restSets: 2 },
};

const SPECIAL_WEEKS = [
  { wk: 21, pu: [4, 10], pl: [4, 5],  sq: [4, 15], cr: [2, 15], label: "Full deload" },
  { wk: 22, test: true,                                            label: "TEST WEEK"  },
  { wk: 23, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
  { wk: 24, pu: [7, 18], pl: [7, 11], sq: [7, 30], cr: [3, 28], label: "Maintain"   },
];

export function computeBlockSets(ex, blockIdx) {
  if (ex.sets !== undefined) return ex.sets;
  return blockIdx + 1 < PROGRAM.setJumpAtBlock ? ex.initialSets : ex.peakSets;
}

export function computeStartReps(ex, blockIdx) {
  if (ex.blockStartReps) return ex.blockStartReps[blockIdx];
  if (blockIdx === 0) return ex.initialReps;
  const prevSets  = computeBlockSets(ex, blockIdx - 1);
  const currSets  = computeBlockSets(ex, blockIdx);
  const prevStart = computeStartReps(ex, blockIdx - 1);
  const prevEnd   = prevStart + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  if (currSets > prevSets) return prevStart;
  return prevEnd + ex.transitionBonus;
}

export function weekReps(ex, blockIdx, weekInBlock) {
  return computeStartReps(ex, blockIdx) + weekInBlock * ex.increment;
}

export function restReps(ex, blockIdx) {
  const peak = computeStartReps(ex, blockIdx) + (PROGRAM.activeWeeksPerBlock - 1) * ex.increment;
  return Math.round(peak * PROGRAM.restFraction);
}

export function generatePlan() {
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
  plan.push(...SPECIAL_WEEKS);
  return plan;
}
