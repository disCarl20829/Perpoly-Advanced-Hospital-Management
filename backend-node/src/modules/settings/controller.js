import * as settingsService from './service.js';
import {
    validateSeniorDiscount,
    validateCreateDepartment,
    validateUpdateDepartment,
    validateCreateTest,
    validateUpdateTest
} from './validation.js';

// ============================================================
// CASHIER SETTINGS
// ============================================================

/**
 * Get the senior citizen discount rate.
 */
export async function getSeniorDiscount(req, res, next) {
    try {
        const seniorDiscountRate = await settingsService.getSeniorDiscount();
        res.json({ seniorDiscountRate });
    } catch (err) {
        next(err);
    }
}

/**
 * Update the senior citizen discount rate.
 */
export async function updateSeniorDiscount(req, res, next) {
    try {
        validateSeniorDiscount(req.body);

        const rate = Number(req.body.senior_discount_rate);
        const settings = await settingsService.updateSeniorDiscount(rate, req.user.id);

        res.json({
            message: 'Senior discount updated',
            seniorDiscountRate: Number(settings.senior_discount_rate)
        });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// DEPARTMENTS
// ============================================================

/**
 * Get all departments.
 */
export async function getDepartments(req, res, next) {
    try {
        const departments = await settingsService.getDepartments();
        res.json({ departments });
    } catch (err) {
        next(err);
    }
}

/**
 * Create a department.
 */
export async function createDepartment(req, res, next) {
    try {
        validateCreateDepartment(req.body);

        const { name, is_active } = req.body;
        const department = await settingsService.createDepartment({ name, is_active });
        res.status(201).json({ message: 'Department created', department });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a department.
 */
export async function updateDepartment(req, res, next) {
    try {
        validateUpdateDepartment(req.body);

        const { id } = req.params;
        const { name, is_active } = req.body;
        const department = await settingsService.updateDepartment(id, { name, is_active });
        res.json({ message: 'Department updated', department });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete (or deactivate, when in use) a department.
 */
export async function deleteDepartment(req, res, next) {
    try {
        const { id } = req.params;
        const result = await settingsService.deleteDepartment(id);
        res.json({
            message: result.deactivated ? 'Department deactivated' : 'Department deleted',
            ...result
        });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// TESTS
// ============================================================

/**
 * Get all tests.
 */
export async function getTests(req, res, next) {
    try {
        const filters = {};

        if (req.query.active !== undefined) {
            filters.active = req.query.active === 'true' || req.query.active === '1';
        }
        if (req.query.category) {
            filters.category = req.query.category;
        }
        if (req.query.search) {
            filters.search = req.query.search;
        }

        const tests = await settingsService.getTests(filters);
        res.json({ tests });
    } catch (err) {
        next(err);
    }
}

/**
 * Create a test.
 */
export async function createTest(req, res, next) {
    try {
        validateCreateTest(req.body);

        const { name, category, default_price, notes, is_active } = req.body;
        const test = await settingsService.createTest({
            name,
            category,
            default_price,
            notes,
            is_active
        });
        res.status(201).json({ message: 'Test created', test });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a test.
 */
export async function updateTest(req, res, next) {
    try {
        validateUpdateTest(req.body);

        const { id } = req.params;
        const { name, category, default_price, notes, is_active } = req.body;
        const test = await settingsService.updateTest(id, {
            name,
            category,
            default_price,
            notes,
            is_active
        });
        res.json({ message: 'Test updated', test });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete (or deactivate, when used by a transaction) a test.
 */
export async function deleteTest(req, res, next) {
    try {
        const { id } = req.params;
        const result = await settingsService.deleteTest(id);
        res.json({
            message: result.deactivated ? 'Test deactivated' : 'Test deleted',
            ...result
        });
    } catch (err) {
        next(err);
    }
}
