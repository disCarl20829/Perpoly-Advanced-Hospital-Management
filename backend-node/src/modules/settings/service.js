import * as settingsRepo from './repository.js';

// ============================================================
// CASHIER SETTINGS
// ============================================================

/**
 * Get the current senior citizen discount rate.
 * @returns {number} percentage (0..100)
 */
export async function getSeniorDiscount() {
    const settings = await settingsRepo.findCashierSettings();
    return Number(settings?.senior_discount_rate ?? 20);
}

/**
 * Update the senior citizen discount rate.
 * @param {number} rate - percentage (0..100)
 * @param {string} userId - UUID of the user making the change
 * @returns {object} updated settings
 */
export async function updateSeniorDiscount(rate, userId) {
    const settings = await settingsRepo.updateSeniorDiscount(rate, userId);
    if (!settings) {
        const err = new Error('Cashier settings are not initialized');
        err.status = 500;
        throw err;
    }
    return settings;
}

// ============================================================
// DEPARTMENTS
// ============================================================

/**
 * Get all departments with test counts.
 * @returns {array} list of departments
 */
export async function getDepartments() {
    return await settingsRepo.findAllDepartments();
}

/**
 * Create a department.
 * @param {object} data - { name, is_active }
 * @returns {object} created department
 */
export async function createDepartment({ name, is_active = true }) {
    const trimmed = name.trim();

    const existing = await settingsRepo.findDepartmentByName(trimmed);
    if (existing) {
        const err = new Error(`Department "${trimmed}" already exists`);
        err.status = 409;
        throw err;
    }

    return await settingsRepo.createDepartment({ name: trimmed, is_active });
}

/**
 * Update a department. Renaming cascades to its tests automatically.
 * @param {string} id - UUID
 * @param {object} data - { name, is_active }
 * @returns {object} updated department
 */
export async function updateDepartment(id, data = {}) {
    const existing = await settingsRepo.findDepartmentById(id);
    if (!existing) {
        const err = new Error('Department not found');
        err.status = 404;
        throw err;
    }

    const updates = {};

    if (data.name !== undefined) {
        const trimmed = data.name.trim();
        const clash = await settingsRepo.findDepartmentByName(trimmed);
        if (clash && clash.id !== id) {
            const err = new Error(`Department "${trimmed}" already exists`);
            err.status = 409;
            throw err;
        }
        updates.name = trimmed;
    }

    if (data.is_active !== undefined) {
        updates.is_active = data.is_active;
    }

    return await settingsRepo.updateDepartment(id, updates);
}

/**
 * Delete a department. If it is referenced anywhere it is deactivated
 * instead, so historical results and transactions stay intact.
 * @param {string} id - UUID
 * @returns {object} { deactivated, department }
 */
export async function deleteDepartment(id) {
    const existing = await settingsRepo.findDepartmentById(id);
    if (!existing) {
        const err = new Error('Department not found');
        err.status = 404;
        throw err;
    }

    const refs = await settingsRepo.countDepartmentReferences(id, existing.name);
    const inUse = Object.values(refs).some((count) => count > 0);

    if (inUse) {
        const department = await settingsRepo.deactivateDepartment(id);
        return { deactivated: true, department };
    }

    const department = await settingsRepo.deleteDepartment(id);
    return { deactivated: false, department };
}

// ============================================================
// TESTS
// ============================================================

/**
 * Get all tests.
 * @param {object} filters - { active, category, search }
 * @returns {array} list of tests
 */
export async function getTests(filters = {}) {
    return await settingsRepo.findAllTests(filters);
}

/**
 * Resolve a department by name, returning its canonical spelling.
 * @param {string} category
 * @returns {object} department
 */
async function resolveDepartment(category) {
    const department = await settingsRepo.findDepartmentByName(category.trim());
    if (!department) {
        const err = new Error(`Department "${category}" not found`);
        err.status = 400;
        throw err;
    }
    return department;
}

/**
 * Create a test.
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object} created test
 */
export async function createTest(data) {
    const name = data.name.trim();
    const department = await resolveDepartment(data.category);

    const existing = await settingsRepo.findTestByNameAndCategory(name, department.name);
    if (existing) {
        const err = new Error(`Test "${name}" already exists in ${department.name}`);
        err.status = 409;
        throw err;
    }

    return await settingsRepo.createTest({
        name,
        category: department.name,
        default_price: data.default_price ?? 0,
        notes: data.notes ?? null,
        is_active: data.is_active ?? true
    });
}

/**
 * Update a test.
 * @param {string} id - UUID
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object} updated test
 */
export async function updateTest(id, data = {}) {
    const existing = await settingsRepo.findTestById(id);
    if (!existing) {
        const err = new Error('Test not found');
        err.status = 404;
        throw err;
    }

    const updates = {};

    if (data.name !== undefined) {
        updates.name = data.name.trim();
    }

    if (data.category !== undefined) {
        const department = await resolveDepartment(data.category);
        updates.category = department.name;
    }

    if (data.default_price !== undefined) {
        updates.default_price = data.default_price;
    }

    if (data.notes !== undefined) {
        updates.notes = data.notes;
    }

    if (data.is_active !== undefined) {
        updates.is_active = data.is_active;
    }

    const finalName = updates.name ?? existing.name;
    const finalCategory = updates.category ?? existing.category;

    const clash = await settingsRepo.findTestByNameAndCategory(finalName, finalCategory, id);
    if (clash) {
        const err = new Error(`Test "${finalName}" already exists in ${finalCategory}`);
        err.status = 409;
        throw err;
    }

    return await settingsRepo.updateTest(id, updates);
}

/**
 * Delete a test. If any transaction item uses it, it is deactivated instead.
 * @param {string} id - UUID
 * @returns {object} { deactivated, test }
 */
export async function deleteTest(id) {
    const existing = await settingsRepo.findTestById(id);
    if (!existing) {
        const err = new Error('Test not found');
        err.status = 404;
        throw err;
    }

    const used = await settingsRepo.countTestUsage(id);

    if (used > 0) {
        const test = await settingsRepo.updateTest(id, { is_active: false });
        return { deactivated: true, test };
    }

    const test = await settingsRepo.deleteTest(id);
    return { deactivated: false, test };
}
