"use client";

import { useState } from "react";
import { formatPercent } from "@/lib/util/format";

// Pure client-side toy — nothing saved, nothing sent anywhere. Compares a
// visitor's own score guess against our real per-game win-probability
// estimate (same number shown on the Schedule page) for a bit of fun
// without needing any backend.
export function ScorePredictor({
  opponent,
  neWinProb,
}: {
  opponent: string;
  neWinProb?: number;
}) {
  const [neScore, setNeScore] = useState("");
  const [oppScore, setOppScore] = useState("");

  const ne = Number(neScore);
  const opp = Number(oppScore);
  const hasPrediction = neScore !== "" && oppScore !== "" && !Number.isNaN(ne) && !Number.isNaN(opp);

  let message: string | null = null;
  if (hasPrediction) {
    const predictedWinner = ne > opp ? "NE" : ne < opp ? opponent : "a tie";
    const margin = Math.abs(ne - opp);
    const modelSaysNe = neWinProb !== undefined && neWinProb >= 0.5;
    const agrees = predictedWinner === "NE" ? modelSaysNe : predictedWinner === opponent ? !modelSaysNe : false;

    const winnerText =
      predictedWinner === "a tie" ? "a tie" : `${predictedWinner} by ${margin}`;

    message =
      neWinProb === undefined
        ? `You've got ${winnerText}.`
        : `You've got ${winnerText}. Our model gives NE a ${formatPercent(neWinProb, 0)} win probability — ${
            agrees ? "you agree with the numbers." : "you're betting against the model."
          }`;
  }

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Make the Call</h3>
      <p className="mt-1 text-sm text-muted">
        Predict the final score — just for fun, nothing saved.
      </p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <label htmlFor="ne-score" className="text-xs font-semibold text-muted">
            NE
          </label>
          <input
            id="ne-score"
            type="number"
            min={0}
            inputMode="numeric"
            value={neScore}
            onChange={(e) => setNeScore(e.target.value)}
            className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-center font-display text-xl font-bold text-foreground"
          />
        </div>
        <span className="mt-4 text-muted">–</span>
        <div className="flex flex-col items-center gap-1">
          <label htmlFor="opp-score" className="text-xs font-semibold text-muted">
            {opponent}
          </label>
          <input
            id="opp-score"
            type="number"
            min={0}
            inputMode="numeric"
            value={oppScore}
            onChange={(e) => setOppScore(e.target.value)}
            className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-center font-display text-xl font-bold text-foreground"
          />
        </div>
      </div>
      {message && (
        <p className="mt-3 border-l-2 border-red pl-2 text-sm italic text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
