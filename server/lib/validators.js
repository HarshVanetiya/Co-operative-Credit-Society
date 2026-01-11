import { z } from "zod";

// Member validation schemas
export const createMemberSchema = z.object({
    mobile: z
        .string({ required_error: "Mobile number is required" })
        .min(10, "Mobile number must be at least 10 digits")
        .max(15, "Mobile number must be at most 15 digits")
        .regex(/^[0-9]+$/, "Mobile number must contain only digits"),
    name: z
        .string()
        .max(100, "Name must be at most 100 characters")
        .optional()
        .nullable(),
    address: z
        .string()
        .max(500, "Address must be at most 500 characters")
        .optional()
        .nullable(),
    fathersName: z
        .string()
        .max(100, "Father's name must be at most 100 characters")
        .optional()
        .nullable(),
    initialAmount: z.number().or(z.string()).optional(),
    developmentFee: z.number().or(z.string()).optional(),
});

export const updateMemberSchema = z.object({
    mobile: z
        .string()
        .min(10, "Mobile number must be at least 10 digits")
        .max(15, "Mobile number must be at most 15 digits")
        .regex(/^[0-9]+$/, "Mobile number must contain only digits")
        .optional(),
    name: z
        .string()
        .max(100, "Name must be at most 100 characters")
        .optional()
        .nullable(),
    address: z
        .string()
        .max(500, "Address must be at most 500 characters")
        .optional()
        .nullable(),
    fathersName: z
        .string()
        .max(100, "Father's name must be at most 100 characters")
        .optional()
        .nullable(),
});

// ID parameter validation
export const idParamSchema = z.object({
    id: z
        .string()
        .regex(/^[0-9]+$/, "ID must be a valid number")
        .transform((val) => parseInt(val, 10)),
});

// Operator validation schemas
export const loginSchema = z.object({
    username: z
        .string({ required_error: "Username is required" })
        .min(1, "Username is required"),
    password: z
        .string({ required_error: "Password is required" })
        .min(1, "Password is required"),
});
