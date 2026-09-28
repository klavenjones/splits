/**
 * TEST ONLY. A cell-by-cell transcription of docs/Weight_LOSS_2024.xlsx (CALCULATIONS) in pounds,
 * written straight from the sheet's formulas and kept deliberately separate from nutrition.ts,
 * so the engine can be checked against it. One array entry per week row pair (weight row 36,
 * 38, … and calorie row 37, 39, …). The Monday cell bug (AP42+ reading AQ36…) is not reproduced:
 * a missed Monday stays empty, as the sheet does in weeks 1–3.
 */

type Cell = number | '';
const num = (c: Cell): c is number => c !== '';

export type SheetInputs = {
  sex: 'male' | 'female'; // G9
  experience: 'beginner' | 'intermediate'; // P5
  goal: 'build_muscle' | 'lose_fat' | 'maintain'; // P8
  startLb: number; // G7
  startBf: number; // G18 / G19 (calculated) → BT36:BT39
  manualRateLbPerWeek?: number; // P15 = Enable, P16
  weeks: { lb: (number | null)[]; kcal: (number | null)[]; bf: number | null }[]; // E:K, Q
};

export type SheetOutputs = {
  maintenance: number; // Q23
  kcal: number; // AW24
  low: number; // Q28
  high: number;
  protein: number; // Q29
  fat: number; // Q30
  carbs: number; // Q31
  weeks: { L: Cell; AW: number; AWc: Cell; ALc: number; AZ: number; BE: number; BD: number }[];
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const mround = (x: number, m: number) => Math.floor(x / m + 0.5) * m;

export function sheetModel(i: SheetInputs): SheetOutputs {
  const G7 = i.startLb;
  const male = i.sex === 'male';
  const BD15 = male ? 1.5 : 1.55;
  const BD22 = male ? 1500 : 1200;
  const AN22 = (370 + 9.8 * (G7 * ((100 - i.startBf) / 100))) * BD15;

  // AP..AV for one row: "" when the row is empty (COUNT < 1); Monday = E or the fallback.
  const fill = (row: (number | null)[], mondayFallback: Cell): Cell[] => {
    const E = row.map((v): Cell => (v === null ? '' : v));
    if (E.filter(num).length < 1) return E.map(() => '');
    const out: Cell[] = [E[0] === '' ? mondayFallback : E[0]];
    for (let d = 1; d < 7; d++) out.push(E[d] === '' ? out[d - 1] : E[d]);
    return out;
  };

  const L: Cell[] = [];
  const AW: number[] = [];
  const AWc: Cell[] = [];
  const ALw: number[] = [];
  const ALc: number[] = [];
  const AZ: number[] = [];
  const BE: number[] = [];
  const BD: number[] = [];
  const U: Cell[] = [];

  i.weeks.forEach((w, k) => {
    const entered = w.lb.filter((v): v is number => v !== null);
    L[k] = entered.length === 0 ? '' : avg(entered); // L36
    const APw = fill(w.lb, k === 0 ? G7 : ''); // AP36 / AP38…
    const APc = fill(w.kcal, ''); // AP37…
    ALw[k] = APw.filter(num).length; // AL36
    ALc[k] = APc.filter(num).length; // AL37
    AW[k] = ALw[k] === 0 ? (k === 0 ? G7 : AW[k - 1]) : avg(APw.filter(num)); // AW36 / AW38
    AWc[k] = ALc[k] === 0 ? (k === 0 ? '' : AWc[k - 1]) : avg(APc.filter(num)); // AW37 / AW39
    AZ[k] = AW[k] - (k === 0 ? G7 : AW[k - 1]); // AZ36 / AZ38
    const noData = ALw[k] === 0 || ALc[k] === 0;
    const est = noData ? 0 : (AWc[k] as number) + (-AZ[k] * 3500) / ALc[k];
    // BE36 = AN22 when AL36 = 0 (and #DIV/0! when only the calories are missing; the engine
    // uses AN22 there too). BE38… repeat the previous week without data.
    BE[k] = noData ? (k === 0 ? AN22 : BE[k - 1]) : est;
    // BD36 / BD38: the estimate itself; BD40…: (estimate + Σ BE38..prev) / AK (= k).
    if (noData) BD[k] = k === 0 ? AN22 : BD[k - 1];
    else if (k < 2) BD[k] = est;
    else BD[k] = (est + BE.slice(1, k).reduce((a, b) => a + b, 0)) / k;
    U[k] = L[k] === '' ? '' : BD[k]; // U36 (BC = BD, AZ is never empty)
  });

  // Protein and body-fat chains over the filtered weight list (BO, BP, BS, BT, BV, BW).
  const BP: number[] = [];
  const BT: number[] = [];
  const BW: number[] = [];
  const perLb = (bf: number) => (male ? (bf < 20 ? 1 : bf <= 25 ? 0.8 : 0.73) : bf <= 25 ? 1 : 0.8); // BV
  i.weeks.forEach((w, k) => {
    const BO = L[k];
    BP[k] = k < 4 ? G7 : num(BO) ? BO : BP[k - 1];
    BT[k] = k < 4 ? i.startBf : w.bf !== null ? w.bf : BT[k - 1];
    const next = BP[k] * perLb(BT[k]);
    BW[k] = k < 4 ? next : Math.abs(next - BW[k - 1]) >= 5 ? next : BW[k - 1];
  });
  const n = i.weeks.length;
  const BY14 = [...L].reverse().find(num) ?? G7;
  const BY15 = n ? BT[n - 1] : i.startBf;
  const BY17 = n ? BW[n - 1] : G7 * perLb(i.startBf);

  // Q23
  const Us = U.filter(num);
  const Q23 = Us.length > 3 ? Us[Us.length - 2] : (370 + 9.8 * (G7 * ((100 - BY15) / 100))) * BD15;

  // Phase (AW8, AW10, AY4–AY6 → AW9) and rate (AX13 / AY13).
  const AW8 = i.goal === 'build_muscle' ? 1 : i.goal === 'lose_fat' ? 2 : 3;
  const cat = male
    ? AW8 === 3
      ? 0
      : BY15 >= 25
        ? 1
        : BY15 > 15
          ? 2
          : BY15 > 12
            ? 3
            : 4
    : AW8 === 3
      ? 0
      : BY15 >= 30
        ? 1
        : BY15 > 25
          ? 2
          : BY15 > 22
            ? 3
            : 4;
  const cut = cat === 1 || (AW8 === 2 && cat >= 2);
  const AW9 = AW8 === 3 ? 2 : cut ? 1 : AW8 === 1 && cat >= 2 ? 3 : 0;
  const bulk = i.experience === 'beginner' ? 1.5 / 4 : 1 / 4;
  const [hi, mid, lo] = male ? [15, 12, 12] : [25, 22, 22];
  const top = male ? 25 : 30;
  const AW13 =
    AW9 === 2
      ? 0
      : BY15 >= top
        ? -0.7
        : AW9 === 3
          ? bulk
          : AW9 === 1
            ? BY15 > hi
              ? -0.7
              : BY15 > mid
                ? -0.5
                : BY15 <= lo
                  ? -0.3
                  : 0
            : 0;
  const AW15 = i.manualRateLbPerWeek ?? (AW13 / 100) * BY14; // AW14 / AW15
  const Q25 = (AW15 * 3500) / 7;
  const AW24 = Math.max(BD22, Q23 + Q25);
  const low = AW24 - 100 < BD22 ? mround(AW24, 50) : mround(AW24 - 100, 50);
  const BD21 = male ? (BY15 < 25 ? 0.22 : 0.25) : 0.3;
  const Q30 = (BD21 * AW24) / 9;
  const Q31 = (AW24 - BY17 * 4 - Q30 * 9) / 4;

  return {
    maintenance: Q23,
    kcal: AW24,
    low,
    high: mround(AW24 + 100, 50),
    protein: BY17,
    fat: Q30,
    carbs: Q31,
    weeks: i.weeks.map((_, k) => ({
      L: L[k],
      AW: AW[k],
      AWc: AWc[k],
      ALc: ALc[k],
      AZ: AZ[k],
      BE: BE[k],
      BD: BD[k],
    })),
  };
}
