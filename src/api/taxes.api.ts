import apiClient from './client';
import { TAX_ENDPOINTS } from '../constants/api';
import type { VatRate, VatCalculatePayload, VatCalculateResult } from '../types/tax.types';

export const fetchVatRates = async (): Promise<VatRate[]> => {
  const { data } = await apiClient.get(TAX_ENDPOINTS.rates);
  return data.data ?? data;
};

export const calculateVat = async (
  payload: VatCalculatePayload
): Promise<VatCalculateResult> => {
  const { data } = await apiClient.post(TAX_ENDPOINTS.calculate, payload);
  return data.data ?? data;
};