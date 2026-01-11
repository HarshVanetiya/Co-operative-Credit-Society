import { ZodError } from "zod";

/**
 * Middleware factory for validating request body against a Zod schema
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            req.body = validatedData; // Replace with validated & transformed data
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues || error.errors || [];
                const errors = issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }));
                return res.status(400).json({
                    error: "Validation failed",
                    details: errors,
                });
            }
            next(error);
        }
    };
};

/**
 * Middleware factory for validating request params against a Zod schema
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validatedParams = schema.parse(req.params);
            req.params = validatedParams; // Replace with validated & transformed params
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues || error.errors || [];
                const errors = issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }));
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: errors,
                });
            }
            next(error);
        }
    };
};

/**
 * Middleware factory for validating request query against a Zod schema
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validatedQuery = schema.parse(req.query);
            req.query = validatedQuery;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues || error.errors || [];
                const errors = issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }));
                return res.status(400).json({
                    error: "Invalid query parameters",
                    details: errors,
                });
            }
            next(error);
        }
    };
};
