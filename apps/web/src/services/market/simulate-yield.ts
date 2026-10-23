import type { PurchaseScenarioInput, YieldCurveInput } from '../../types/yield-bonuses';
import { postApiJson } from '../api-client';
import { parseYieldCurve, parseYieldSimulation } from './yield-bonuses.validation';

export function simulateYield(scpiId: string, input: PurchaseScenarioInput, signal?: AbortSignal) {
  return postApiJson(
    `/api/scpis/${encodeURIComponent(scpiId)}/yield-simulation`,
    input,
    (value) => parseYieldSimulation(value, scpiId, input),
    signal,
  );
}
export function fetchYieldCurve(scpiId: string, input: YieldCurveInput, signal?: AbortSignal) {
  return postApiJson(
    `/api/scpis/${encodeURIComponent(scpiId)}/yield-curve`,
    input,
    (value) => parseYieldCurve(value, scpiId, input),
    signal,
  );
}
