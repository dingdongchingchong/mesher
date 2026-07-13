export type User = {
  id: number;
  email: string;
  name: string;
  messageTemplate?: string;
  targetAmountCents?: number;
  paymentLink?: string | null;
  createdAt?: string;
};

export type Contact = {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  messaged?: number;
  created_at: string;
};

export type MoneyRequest = {
  id: number;
  user_id: number;
  contact_id: number;
  amount_cents: number;
  message: string;
  payment_link: string | null;
  status: "pending" | "sent" | "failed";
  email_sent: number;
  sms_sent: number;
  created_at: string;
  sent_at: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
};

export type Stats = {
  totalContacts: number;
  messaged: number;
  pending: number;
  totalRequests: number;
  targetAmountCents: number;
};
