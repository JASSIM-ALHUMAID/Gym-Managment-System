export type Role = 'admin' | 'trainer' | 'member';

export type DemoUser = {
  user_id: number;
  username: string;
  role: Role;
  full_name: string;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
  member_id?: number;
  trainer_id?: number;
};
