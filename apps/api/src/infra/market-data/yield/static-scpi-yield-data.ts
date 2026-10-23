import type {
  ScpiYieldData,
  ScpiYieldParameters,
} from '../../../application/secondary-market/ports/scpi-yield-data.js';
import { AcquisitionFees } from '../../../domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../domain/secondary-market/value-objects/annual-dividend.js';

/** Manually verified on 2026-10-22. Update annually; never silently reuse the wrong dividend year. */
export class StaticScpiYieldData implements ScpiYieldData {
  async find(scpiId: string, dividendYear: number): Promise<ScpiYieldParameters | null> {
    if (scpiId !== 'primopierre' || dividendYear !== 2025) return null;
    return {
      // Annual report, printed p.6: gross dividend 4.56, distinct from distribution 4.40.
      dividend: new AnnualDividend(2025, 456),
      fees: new AcquisitionFees(480, 500),
      dividendSource: {
        url: 'https://www.praemiareim.fr/documents/14836074/14836290/Primopierre+Rapport+Annuel+2025.pdf/32234cef-d9b6-60b3-9ad5-08bfa8420b37?t=1780564491137',
        pages: [6],
      },
      feesSource: {
        url: 'https://www.praemiareim.fr/documents/14836074/14836293/2026+08+01+PRIMOPIERRE+Note+d+information+v1c.pdf/9f7ca363-89d3-c809-5bda-e0990c3bea00?t=1786105513135',
        pages: [20, 24],
      },
    };
  }
}
