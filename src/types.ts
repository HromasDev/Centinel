import { Context } from 'grammy';

export interface Product {
  name: string;
  seller: string;
  sales: string;
  price: number;
  href: string;
}

export interface AppState {
  limit: number;
  compact: boolean;
  lastKnownProducts: Product[];
}

export interface CustomContext extends Context {
  config: {
    receiverId: number;
  };
}
