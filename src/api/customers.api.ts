import apiClient from './client';
import { CUSTOMER_ENDPOINTS } from '../constants/api';
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerFilterParams,
  PaginatedCustomers,
} from '../types/customer.types';

export const fetchCustomers = async (
  params: CustomerFilterParams
): Promise<PaginatedCustomers> => {
  const { data } = await apiClient.get(CUSTOMER_ENDPOINTS.list, { params });
  return data.data ?? data;
};

export const createCustomer = async (
  payload: CreateCustomerPayload
): Promise<Customer> => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (key === 'trn_document' || key === 'logo') {
      // React Native FormData file shape: { uri, name, type }
      formData.append(key, value as any);
    } else {
      formData.append(key, String(value));
    }
  });

  const { data } = await apiClient.post(CUSTOMER_ENDPOINTS.list, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data ?? data;
};

export const fetchCustomer = async (customerId: string): Promise<Customer> => {
  const { data } = await apiClient.get(CUSTOMER_ENDPOINTS.detail(customerId));
  return data.data ?? data;
};

export const updateCustomer = async (
  customerId: string,
  payload: UpdateCustomerPayload
): Promise<Customer> => {
  const { data } = await apiClient.put(CUSTOMER_ENDPOINTS.detail(customerId), payload);
  return data.data ?? data;
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  await apiClient.delete(CUSTOMER_ENDPOINTS.detail(customerId));
};