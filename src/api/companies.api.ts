import apiClient from './client';
import { COMPANY_ENDPOINTS } from '../constants/api';
import type {
  Company,
  CompanyMember,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  AddMemberPayload,
  UpdateMemberPayload,
} from '../types/company.types.ts';

// ───────────────────────────────────────────
// Companies — list / create
// ───────────────────────────────────────────

export const fetchCompanies = async (): Promise<Company[]> => {
  const { data } = await apiClient.get(COMPANY_ENDPOINTS.list);
  return data.data ?? data;
};

export const createCompany = async (
  payload: CreateCompanyPayload
): Promise<Company> => {
  const { data } = await apiClient.post(COMPANY_ENDPOINTS.list, payload);
  return data.data ?? data;
};

// ───────────────────────────────────────────
// Company detail — get / update / delete
// ───────────────────────────────────────────

export const fetchCompany = async (companyId: string): Promise<Company> => {
  const { data } = await apiClient.get(COMPANY_ENDPOINTS.detail(companyId));
  return data.data ?? data;
};

export const updateCompany = async (
  companyId: string,
  payload: UpdateCompanyPayload
): Promise<Company> => {
  const { data } = await apiClient.put(
    COMPANY_ENDPOINTS.detail(companyId),
    payload
  );
  return data.data ?? data;
};

export const deleteCompany = async (companyId: string): Promise<void> => {
  await apiClient.delete(COMPANY_ENDPOINTS.detail(companyId));
};

// ───────────────────────────────────────────
// Members — list / add
// ───────────────────────────────────────────

export const fetchMembers = async (
  companyId: string
): Promise<CompanyMember[]> => {
  const { data } = await apiClient.get(COMPANY_ENDPOINTS.members(companyId));
  return data.data ?? data;
};

export const addMember = async (
  companyId: string,
  payload: AddMemberPayload
): Promise<CompanyMember> => {
  const { data } = await apiClient.post(
    COMPANY_ENDPOINTS.members(companyId),
    payload
  );
  return data.data ?? data;
};

// ───────────────────────────────────────────
// Member detail — get / update / remove
// ───────────────────────────────────────────

export const fetchMember = async (
  companyId: string,
  memberId: string
): Promise<CompanyMember> => {
  const { data } = await apiClient.get(
    COMPANY_ENDPOINTS.memberDetail(companyId, memberId)
  );
  return data.data ?? data;
};

export const updateMember = async (
  companyId: string,
  memberId: string,
  payload: UpdateMemberPayload
): Promise<CompanyMember> => {
  const { data } = await apiClient.patch(
    COMPANY_ENDPOINTS.memberDetail(companyId, memberId),
    payload
  );
  return data.data ?? data;
};

export const removeMember = async (
  companyId: string,
  memberId: string
): Promise<void> => {
  await apiClient.delete(COMPANY_ENDPOINTS.memberDetail(companyId, memberId));
};


// 1. Centralized API Service: This file acts as a bridge between your mobile app and the backend server, 
// handling all network requests specifically for Companies and their Members.

// 2. Company CRUD Operations: It contains functions to fetch a list of companies, 
// view details of a specific company, create a new company, update its info, or delete it entirely.

// 3. Team Management: It allows the app to fetch the full list of employees/members belonging to a specific company
//  and handle adding new members to that team.

// 4. Individual Member Controls: It provides explicit functions to view a single member's profile,
//  edit their specific details, or remove them from the company's roster.

// 5. Smart Data Parsing: It uses a safe fallback (data.data ?? data) to make sure that even if the backend 
// changes its response structure slightly, your app's UI always receives clean, un-nested data without crashing.