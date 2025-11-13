export default function UserInputsPrintSummary({
  age,
  retirementAge,
  maritalStatus,
  taxable,
  pretax,
  roth,
  taxableContrib,
  pretaxContrib,
  rothContrib,
  inflation,
  withdrawalRate,
  monteCarloRuns,
  returnModel
}: {
  age: number;
  retirementAge: number;
  maritalStatus: string;
  taxable: string;
  pretax: string;
  roth: string;
  taxableContrib: string;
  pretaxContrib: string;
  rothContrib: string;
  inflation: number;
  withdrawalRate: number;
  monteCarloRuns: number;
  returnModel?: string;
}) {
  return (
    <div className="hidden print:block print-section user-inputs-print print-input-summary">
      <div>
        <h3>User Inputs — Personal</h3>
        <p>Age: {age}</p>
        <p>Retirement Age: {retirementAge}</p>
        <p>Marital Status: {maritalStatus}</p>
      </div>

      <div>
        <h3>Starting Balances</h3>
        <p>Taxable: {taxable}</p>
        <p>Pre-Tax: {pretax}</p>
        <p>Roth: {roth}</p>
      </div>

      <div>
        <h3>Annual Contributions</h3>
        <p>Taxable: {taxableContrib}</p>
        <p>Pre-Tax: {pretaxContrib}</p>
        <p>Roth: {rothContrib}</p>
      </div>

      <div>
        <h3>Assumptions</h3>
        <p>Inflation: {inflation}%</p>
        <p>Withdrawal Rate: {withdrawalRate}%</p>
        <p>Monte Carlo Runs: {monteCarloRuns}</p>
        <p>Return Model: {returnModel || 'Historical 1928–2024 Bootstrap'}</p>
      </div>
    </div>
  );
}
