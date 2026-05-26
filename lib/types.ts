export interface FirebaseEvent {
  id: string;
  name: string;
  date: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface OptionChoice {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  order: number;
  optionGroups?: OptionGroup[];
}

export interface SelectedOption {
  groupId: string;
  groupName: string;
  choiceIds: string[];
  choiceNames: string[];
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  selectedOptions?: SelectedOption[];
}

export interface Order {
  id: string;
  lidNaam: string;
  lidId: string;
  eventId: string;
  items: OrderItem[];
  totaal: number;
  cashGegeven: number | null;
  wisselgeld: number | null;
  createdAt: Date;
}
