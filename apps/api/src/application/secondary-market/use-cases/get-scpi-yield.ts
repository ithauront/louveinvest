import { CalculateInvestmentYield } from '../../../domain/secondary-market/services/calculate-investment-yield.js';
import type { ScpiYieldResult } from '../dtos/scpi-yield-result.js';
import { YieldDataUnavailableError } from '../errors/yield-data-unavailable-error.js';
import type { ScpiYieldData } from '../ports/scpi-yield-data.js';
import type { GetScpiMarket } from './get-scpi-market.js';

export class GetScpiYield {
  constructor(
    private readonly getMarket: GetScpiMarket,
    private readonly yieldData: ScpiYieldData,
    private readonly now: () => Date = () => new Date(),
    private readonly calculator = new CalculateInvestmentYield(),
  ) {}

  async execute(input: { scpiId: string }): Promise<ScpiYieldResult> {
    // Reference is the current civil year in France, not the last execution's year.
    const dividendYear =
      Number(
        new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Paris' }).format(
          this.now(),
        ),
      ) - 1;
    const market = await this.getMarket.execute(input);
    const parameters = await this.yieldData.find(input.scpiId, dividendYear);
    if (!parameters || parameters.dividend.year !== dividendYear) {
      throw new YieldDataUnavailableError(input.scpiId, dividendYear);
    }
    const { dividend, fees, dividendSource, feesSource } = parameters;
    const calculation = this.calculator.execute({
      dividend,
      fees,
      sellerPriceCents: market.lastExecution.sellerPriceCents,
    });
    return {
      ...calculation,
      scpi: market.scpi,
      source: market.source,
      freshness: market.freshness,
      warnings: market.warnings,
      execution: market.lastExecution,
      dividend: {
        year: dividend.year,
        grossPerShareCents: dividend.grossPerShareCents,
        source: dividendSource,
      },
      fees: {
        commissionBasisPoints: fees.commissionBasisPoints,
        registrationBasisPoints: fees.registrationBasisPoints,
        fixedFeesIncluded: false,
        source: feesSource,
      },
    };
  }
}
