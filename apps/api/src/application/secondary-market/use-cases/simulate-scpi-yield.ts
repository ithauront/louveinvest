import { CalculatePurchaseYield } from '../../../domain/secondary-market/services/calculate-purchase-yield.js';
import {
  CalculateYieldCurve,
  type YieldCurveInput,
} from '../../../domain/secondary-market/services/calculate-yield-curve.js';
import { AcquisitionFees } from '../../../domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../domain/secondary-market/value-objects/annual-dividend.js';
import {
  YieldSimulation,
  type YieldSimulationInput,
} from '../../../domain/secondary-market/value-objects/yield-simulation.js';
import type { GetScpiYield } from './get-scpi-yield.js';

export class SimulateScpiYield {
  constructor(
    private readonly getYield: GetScpiYield,
    private readonly calculator = new CalculatePurchaseYield(),
    private readonly curve = new CalculateYieldCurve(),
  ) {}

  private async context(scpiId: string) {
    // Reuse the same annual reference, provenance and shared market cache as GET /yield.
    const reference = await this.getYield.execute({ scpiId });
    return {
      reference,
      dividend: new AnnualDividend(reference.dividend.year, reference.dividend.grossPerShareCents),
      fees: new AcquisitionFees(
        reference.fees.commissionBasisPoints,
        reference.fees.registrationBasisPoints,
      ),
    };
  }

  async execute(input: { scpiId: string } & YieldSimulationInput) {
    const purchase = new YieldSimulation(input);
    const { reference, dividend, fees } = await this.context(input.scpiId);
    return {
      reference,
      fixedFeesBasis: 'user-assumption' as const,
      simulation: this.calculator.execute({ dividend, fees, purchase }),
    };
  }

  async executeCurve(input: { scpiId: string } & YieldCurveInput) {
    const { reference, dividend, fees } = await this.context(input.scpiId);
    return {
      reference,
      fixedFeesBasis: 'user-assumption' as const,
      points: this.curve.execute(input, dividend, fees),
    };
  }
}
