import apiClient from './client';
import { REPORT_ENDPOINTS } from '../constants/api';
import type { ArSummary, ArAging, ArCustomerOutstanding } from '../types/reports.types';

const unwrap = (data: any) => data?.data ?? data;

export const fetchArSummary = async (companyId: string): Promise<ArSummary> => {
  const { data } = await apiClient.get(REPORT_ENDPOINTS.arSummary, {
    params: { company_id: companyId },
  });
  return unwrap(data);
};

export const fetchArAging = async (companyId: string): Promise<ArAging> => {
  const { data } = await apiClient.get(REPORT_ENDPOINTS.arAging, {
    params: { company_id: companyId },
  });
  return unwrap(data);
};

export const fetchArByCustomer = async (
  companyId: string
): Promise<ArCustomerOutstanding[]> => {
  const { data } = await apiClient.get(REPORT_ENDPOINTS.arByCustomer, {
    params: { company_id: companyId },
  });
  const body = unwrap(data);
  const rows: any[] = Array.isArray(body) ? body : body?.results ?? [];
  // Field names aren't fully documented — map defensively.
  return rows.map((r) => ({
    customer_id: r.customer_id ?? r.id ?? r.customer,
    customer_name: r.customer_name ?? r.name ?? '—',
    invoice_count: r.invoice_count ?? r.invoices ?? r.count ?? 0,
    overdue: r.overdue ?? r.total_overdue ?? r.overdue_amount ?? 0,
    outstanding:
      r.outstanding ?? r.total_outstanding ?? r.outstanding_amount ?? r.balance ?? 0,
  }));
};
