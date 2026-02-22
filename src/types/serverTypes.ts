export interface ServerUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}
