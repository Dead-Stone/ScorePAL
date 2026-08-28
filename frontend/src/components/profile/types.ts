/**
 * Types for Profile Page
 */

import * as z from 'zod';

export const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['teacher', 'student', 'grader', 'admin']).optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
