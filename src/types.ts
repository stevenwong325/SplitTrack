export interface Participant {
  id: string;
  name: string;
}

export interface Currency {
  code: string;
  symbol: string;
  rate: number; // 1 unit of this currency = X units of Base Currency (HKD)
  isBase?: boolean;
}

export type Category = 
  | 'Food' 
  | 'Transport' 
  | 'Lodging' 
  | 'Entertainment' 
  | 'Income' 
  | 'Shopping' 
  | 'Others';

export type TransactionType = 'expense' | 'income';
export type SplitMode = 'equally' | 'custom';

export interface SplitShare {
  participantId: string;
  amount: number; // Share amount in the transaction's original currency
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Amount in the original currency
  currency: string; // e.g., 'HKD', 'JPY'
  rate: number; // Rate at the time of transaction (1 unit original currency = X base currency)
  date: string; // YYYY-MM-DD
  category: Category;
  type: TransactionType;
  paidBy: string; // Participant ID who paid (only relevant if type is 'expense' or group split)
  isPersonal: boolean; // true = personal, false = group split
  splitMode: SplitMode;
  splits: SplitShare[]; // Array of shares
}

export interface Debt {
  from: string; // Participant ID who owes
  to: string; // Participant ID who is owed
  amount: number; // Amount in Base Currency (HKD)
}

export interface AppState {
  participants: Participant[];
  currencies: Currency[];
  transactions: Transaction[];
  baseCurrencyCode: string;
}
