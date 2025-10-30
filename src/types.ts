export interface User {
  _id: string;
  email: string;
  name?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Property {
  _id: string;
  title: string;
  address?: string;
  price?: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type PropertiesResponse =
  | Property[]
  | { items: Property[]; total?: number; page?: number; pageSize?: number };
