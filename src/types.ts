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

export type TransactionType = 'expense' | 'income' | 'settlement';
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
  settlementFrom?: string; // Participant ID who sends a settlement payment
  settlementTo?: string; // Participant ID who receives a settlement payment
  note?: string; // Optional free text attached to a settlement payment (e.g. "paid the rest in cash")
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

/** Category used to group in-app improvement notes. */
export type RemarkTag = 'Bug' | 'UX' | 'Feature' | 'Idea';

export type RemarkStatus = 'open' | 'done';

/**
 * A personal note about what could still be improved in the app. Remarks are
 * stored outside of the ledger (separate storage key) so that resetting or
 * demo-loading the ledger never destroys them.
 */
export interface Remark {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
  status: RemarkStatus;
  tag?: RemarkTag;
}

/**
 * Shape accepted by `importData`. `remarks` is optional so that backups made
 * before the Remarks feature still import cleanly.
 */
export interface BackupPayload extends AppState {
  remarks?: Remark[];
}
