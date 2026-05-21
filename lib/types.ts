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

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  order: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
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
