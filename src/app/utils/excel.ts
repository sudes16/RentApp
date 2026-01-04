import * as XLSX from 'xlsx';
import { Property, Tenancy, Payment, User, ParentProperty } from './db';

// Helper to get parent property info
const getParentPropertyInfo = (parentPropertyId: string, parentProperties: ParentProperty[]) => {
  const parent = parentProperties.find(p => p.id === parentPropertyId);
  return {
    name: parent?.name || 'Unknown',
    address: parent?.address || 'Unknown'
  };
};

// Export all data to Excel
export const exportAllDataToExcel = (
  properties: Property[],
  parentProperties: ParentProperty[],
  tenancies: Tenancy[],
  payments: Payment[],
  tenants: User[]
) => {
  const wb = XLSX.utils.book_new();
  
  // Properties sheet
  const propertiesData = properties.map(p => {
    const parent = getParentPropertyInfo(p.parentPropertyId, parentProperties);
    return {
      'Parent Property': parent.name,
      'Parent Address': parent.address,
      'Unit Name': p.unitName,
      'Unit Details': p.unitDetails || '',
      'Type': p.type,
      'Rent Amount': p.rentAmount,
      'Frequency': p.rentFrequency,
      'Due Day': p.dueDay,
      'Security Deposit': p.securityDeposit || 0,
      'Status': p.status,
      'Notes': p.notes || ''
    };
  });
  const wsProperties = XLSX.utils.json_to_sheet(propertiesData);
  XLSX.utils.book_append_sheet(wb, wsProperties, 'Properties');
  
  // Tenancies sheet
  const tenanciesData = tenancies.map(t => {
    const property = properties.find(p => p.id === t.propertyId);
    const parent = property ? getParentPropertyInfo(property.parentPropertyId, parentProperties) : { name: '', address: '' };
    const tenant = tenants.find(u => u.id === t.tenantId);
    return {
      'Parent Property': parent.name,
      'Unit': property?.unitName || '',
      'Tenant': tenant?.name || '',
      'Tenant Email': tenant?.email || '',
      'Rent Amount': t.rentAmount,
      'Frequency': t.rentFrequency,
      'Start Date': t.startDate,
      'Next Due Date': t.nextDueDate,
      'Advance Balance': t.advanceBalance,
      'Status': t.status
    };
  });
  const wsTenancies = XLSX.utils.json_to_sheet(tenanciesData);
  XLSX.utils.book_append_sheet(wb, wsTenancies, 'Tenancies');
  
  // Payments sheet
  const paymentsData = payments.map(p => {
    const property = properties.find(pr => pr.id === p.propertyId);
    const parent = property ? getParentPropertyInfo(property.parentPropertyId, parentProperties) : { name: '', address: '' };
    const tenant = tenants.find(u => u.id === p.tenantId);
    return {
      'Date': p.date,
      'Receipt No': p.receiptNumber,
      'Parent Property': parent.name,
      'Unit': property?.unitName || '',
      'Tenant': tenant?.name || '',
      'Amount': p.amount,
      'Method': p.method,
      'Advance Used': p.advanceUsed,
      'Notes': p.notes || ''
    };
  });
  const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');
  
  // Download
  const fileName = `RentHub_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Export properties only
export const exportPropertiesToExcel = (properties: Property[]) => {
  // Get parent properties from localStorage
  const parentProperties: ParentProperty[] = JSON.parse(localStorage.getItem('renthub_parent_properties') || '[]');
  
  const wb = XLSX.utils.book_new();
  const data = properties.map(p => {
    const parent = getParentPropertyInfo(p.parentPropertyId, parentProperties);
    return {
      'Parent Property': parent.name,
      'Parent Address': parent.address,
      'Unit Name': p.unitName,
      'Unit Details': p.unitDetails || '',
      'Type': p.type,
      'Rent Amount': p.rentAmount,
      'Frequency': p.rentFrequency,
      'Due Day': p.dueDay,
      'Security Deposit': p.securityDeposit || 0,
      'Status': p.status,
      'Notes': p.notes || ''
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Properties');
  const fileName = `Properties_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Export payment report
export const exportPaymentReportToExcel = (
  payments: Payment[],
  properties: Property[],
  tenants: User[]
) => {
  // Get parent properties from localStorage
  const parentProperties: ParentProperty[] = JSON.parse(localStorage.getItem('renthub_parent_properties') || '[]');
  
  const wb = XLSX.utils.book_new();
  const data = payments.map(p => {
    const property = properties.find(pr => pr.id === p.propertyId);
    const parent = property ? getParentPropertyInfo(property.parentPropertyId, parentProperties) : { name: '', address: '' };
    const tenant = tenants.find(u => u.id === p.tenantId);
    return {
      'Date': p.date,
      'Receipt No': p.receiptNumber,
      'Parent Property': parent.name,
      'Unit': property?.unitName || '',
      'Tenant': tenant?.name || '',
      'Amount': p.amount,
      'Method': p.method,
      'Advance Used': p.advanceUsed,
      'Notes': p.notes || ''
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  const fileName = `Payment_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Generate receipt as downloadable HTML/Text
export const generateReceipt = (
  payment: Payment,
  property: Property,
  tenant: User,
  owner: User
): string => {
  // Get parent property from localStorage
  const parentProperties: ParentProperty[] = JSON.parse(localStorage.getItem('renthub_parent_properties') || '[]');
  const parent = getParentPropertyInfo(property.parentPropertyId, parentProperties);
  
  return `
RENTAL PAYMENT RECEIPT
=====================================

Receipt No: ${payment.receiptNumber}
Date: ${new Date(payment.date).toLocaleDateString()}

FROM:
${owner.name}
${owner.email}
${owner.phone || ''}

TO:
${tenant.name}
${tenant.email}
${tenant.phone || ''}

PROPERTY:
${parent.name} - ${property.unitName}
${parent.address}
${property.unitDetails ? property.unitDetails : ''}

PAYMENT DETAILS:
Amount Paid: ₹${payment.amount.toFixed(2)}
Payment Method: ${payment.method.replace('_', ' ').toUpperCase()}
Advance Used: ₹${payment.advanceUsed.toFixed(2)}
${payment.notes ? `Notes: ${payment.notes}` : ''}

=====================================
Thank you for your payment.
  `.trim();
};

// Download receipt as text file
export const downloadReceipt = (
  payment: Payment,
  property: Property,
  tenant: User,
  owner: User
) => {
  const receipt = generateReceipt(payment, property, tenant, owner);
  const blob = new Blob([receipt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt_${payment.receiptNumber}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};