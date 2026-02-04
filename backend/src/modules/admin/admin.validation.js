// src/modules/admin/admin.validation.js
const { z } = require("zod");
const { ALLOWED_ROLES } = require("../../utils/roles.util");

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            params: req.params,
            query: req.query,
            body: req.body,
        });
        return next();
    } catch (err) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request",
            },
        });
    }
};

const paginationSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
    }),
    params: z.any(),
    body: z.any(),
});

const roleChangeSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/),
    }),
    body: z.object({
        role: z.enum(ALLOWED_ROLES),
    }),
    query: z.any(),
});

const banChangeSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/),
    }),
    body: z.object({
        banned: z.boolean(),
    }),
    query: z.any(),
});

module.exports = {
    validatePagination: validate(paginationSchema),
    validateRoleChange: validate(roleChangeSchema),
    validateBanChange: validate(banChangeSchema),
};
