export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export type UserCreateInput = {
  email: string;
  username: string;
  password: string;
};

export type UserLoginInput = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};
