import { z } from 'zod/v4';

const loginInputSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(1000),
});

const userResponseSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  role: z.enum(['admin', 'user']),
  created_at: z.string(),
});

const loginResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
});

z.globalRegistry.add(userResponseSchema, { id: 'User' });
z.globalRegistry.add(loginInputSchema, { id: 'LoginInput' });
z.globalRegistry.add(loginResponseSchema, { id: 'LoginResponse' });

type LoginInput = z.infer<typeof loginInputSchema>;
type UserResponse = z.infer<typeof userResponseSchema>;
type LoginResponse = z.infer<typeof loginResponseSchema>;

export type { LoginInput, LoginResponse, UserResponse };
export { loginInputSchema, loginResponseSchema, userResponseSchema };
