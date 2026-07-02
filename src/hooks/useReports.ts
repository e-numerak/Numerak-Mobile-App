import { useQuery } from '@tanstack/react-query';
import { fetchArSummary, fetchArAging, fetchArByCustomer } from '../api/reports.api';

export function useArSummary(companyId: string) {
  return useQuery({
    queryKey: ['reports', 'ar', 'summary', companyId],
    queryFn: () => fetchArSummary(companyId),
    enabled: !!companyId,
  });
}

export function useArAging(companyId: string) {
  return useQuery({
    queryKey: ['reports', 'ar', 'aging', companyId],
    queryFn: () => fetchArAging(companyId),
    enabled: !!companyId,
  });
}

export function useArByCustomer(companyId: string) {
  return useQuery({
    queryKey: ['reports', 'ar', 'by-customer', companyId],
    queryFn: () => fetchArByCustomer(companyId),
    enabled: !!companyId,
  });
}
