import { z } from 'zod';

export const emailSchema = z.email('Email inválido');

export const passwordSchema = z
  .string()
  .min(6, 'Mínimo 6 caracteres')
  .max(72, 'Máximo 72 caracteres');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const displayNameSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Mínimo 2 caracteres')
      .max(50, 'Máximo 50 caracteres'),
  });

export const nutritionGoalsSchema = z.object({
  calories: z.number().int().min(800).max(10000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(1000),
  fat: z.number().int().min(0).max(1000),
});

export const bodyMetricsSchema = z.object({
  sex: z.enum(['female', 'male', 'unspecified']),
  ageYears: z.number().int().min(14, 'Mínimo 14 años').max(90, 'Máximo 90 años'),
  heightCm: z.number().min(120, 'Revisá la altura').max(230, 'Revisá la altura'),
  weightKg: z.number().min(35, 'Revisá el peso').max(250, 'Revisá el peso'),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, 'Código de 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DisplayNameInput = z.infer<typeof displayNameSchema>;
export type NutritionGoalsInput = z.infer<typeof nutritionGoalsSchema>;
export type BodyMetricsInput = z.infer<typeof bodyMetricsSchema>;
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;
