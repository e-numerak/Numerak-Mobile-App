import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchVatRates, calculateVat } from '../api/taxes.api';
import type { VatCalculatePayload } from '../types/tax.types';

export function useVatRates() {
  return useQuery({
    queryKey: ['tax-rates'],
    queryFn: fetchVatRates,
    staleTime: 1000 * 60 * 60, // rates rarely change — cache for 1 hour
  });
}

export function useCalculateVat() {
  return useMutation({
    mutationFn: (payload: VatCalculatePayload) => calculateVat(payload),
  });
}