// Monte Carlo Web Worker - Offloads heavy computation to separate thread
// NO React, NO DOM - pure computation only

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === 'run') {
    try {
      const result = runMonteCarloSimulation(payload);
      self.postMessage({ type: 'done', result });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message || 'Monte Carlo simulation failed'
      });
    }
  }
};

function runMonteCarloSimulation(inputs) {
  const {
    marital, age1, age2, retAge,
    sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1,
    cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, wdRate,
    stateRate, incContrib, incRate,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    numSimulations = 1000
  } = inputs;

  const isMar = marital === 'married';
  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);
  const yrsToRet = retAge - younger;
  const LIFE_EXP = 95;
  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const results = [];
  const successCount = { count: 0 };

  // Run simulations in chunks to avoid blocking
  const CHUNK_SIZE = 100;

  for (let i = 0; i < numSimulations; i++) {
    // Micro-yield every chunk to keep worker responsive
    if (i > 0 && i % CHUNK_SIZE === 0) {
      // Let the event loop breathe
      // Note: Workers don't have requestAnimationFrame, use setTimeout
      // But we'll just run through for now as workers are already off main thread
    }

    const simResult = runSingleSimulation({
      isMar, younger, older, yrsToRet, yrsToSim,
      sTax, sPre, sPost,
      cTax1, cPre1, cPost1, cMatch1,
      cTax2, cPre2, cPost2, cMatch2,
      retRate, infRate, wdRate,
      stateRate, incContrib, incRate,
      includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      seed: Math.random() * 1000000
    });

    results.push(simResult);
    if (simResult.success) successCount.count++;
  }

  // Calculate percentiles
  const sortedEOL = results.map(r => r.endOfLife).sort((a, b) => a - b);
  const p10 = sortedEOL[Math.floor(numSimulations * 0.10)];
  const p50 = sortedEOL[Math.floor(numSimulations * 0.50)];
  const p90 = sortedEOL[Math.floor(numSimulations * 0.90)];

  return {
    median: p50,
    p10,
    p90,
    successRate: (successCount.count / numSimulations) * 100,
    allResults: results,
    summary: {
      medianEndOfLife: p50,
      percentile10: p10,
      percentile90: p90,
      successfulSimulations: successCount.count,
      totalSimulations: numSimulations
    }
  };
}

function runSingleSimulation(params) {
  // Simplified single simulation logic
  // This would contain your actual simulation logic
  const {
    yrsToRet, yrsToSim,
    sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1,
    retRate, infRate, wdRate
  } = params;

  const g_fixed = 1 + retRate / 100;
  const infl_factor = 1 + infRate / 100;

  // Accumulation phase
  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;

  for (let i = 0; i < yrsToRet; i++) {
    const returns = (Math.random() - 0.5) * 0.2 + (retRate / 100); // Simplified random walk
    bTax = bTax * (1 + returns) + cTax1;
    bPre = bPre * (1 + returns) + cPre1 + cMatch1;
    bPost = bPost * (1 + returns) + cPost1;
  }

  // Drawdown phase
  let finalBalance = bTax + bPre + bPost;
  const annualWD = (wdRate / 100) * finalBalance;

  for (let i = 0; i < yrsToSim; i++) {
    const returns = (Math.random() - 0.5) * 0.2 + (retRate / 100);
    finalBalance = finalBalance * (1 + returns) - annualWD * Math.pow(infl_factor, i);

    if (finalBalance < 0) {
      return { endOfLife: finalBalance, success: false };
    }
  }

  return { endOfLife: finalBalance, success: finalBalance > 0 };
}
