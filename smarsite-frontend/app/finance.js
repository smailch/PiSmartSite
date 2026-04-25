const BASE_URL = "http://localhost:3000/api"; // change if your backend is 5000

export const getInvoices = async () => {
  const res = await fetch(`${BASE_URL}/invoices`);
  return res.json();
};

export const createInvoice = async (data) => {
  const res = await fetch(`${BASE_URL}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    console.error("Backend error:", result);
    throw new Error("Create invoice failed");
  }

  return result;
};

export const createPayment = async (data) => {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};

export const getPaymentsByInvoice = async (invoiceId) => {
  const res = await fetch(`${BASE_URL}/payments/invoice/${invoiceId}`);
  return res.json();
};

export const getProjectReport = async (projectId) => {
  const res = await fetch(`${BASE_URL}/reports/project/${projectId}`);
  return res.json();
};