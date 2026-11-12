import * as usersService from './service.js';
import { validateUpdateProfile, validateUpdateStatus, validateUpdateRoles, validateUpdateDoctorLaboratories } from './validation.js';

/**
 * Get all users.
 */
export async function getAllUsers(req, res, next) {
    try {
        const users = await usersService.getAllUsers();
        res.json({ users });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single user by ID.
 */
export async function getUserById(req, res, next) {
    try {
        const { id } = req.params;
        const user = await usersService.getUserById(id);
        res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a user's profile.
 */
export async function updateUserProfile(req, res, next) {
    try {
        validateUpdateProfile(req.body);

        const { id } = req.params;
        const { last_name, first_name, middle_name, extra_name, email, preferred_system } = req.body;

        const user = await usersService.updateUserProfile(id, {
            last_name,
            first_name,
            middle_name,
            extra_name,
            email,
            preferred_system
        });

        res.json({ message: 'User updated successfully', user });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a user's active status.
 */
export async function updateUserActiveStatus(req, res, next) {
    try {
        validateUpdateStatus(req.body);

        const { id } = req.params;
        const { is_active } = req.body;

        const user = await usersService.updateUserActiveStatus(id, is_active);
        res.json({ message: 'User status updated', user });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a user's roles.
 */
export async function updateUserRoles(req, res, next) {
    try {
        validateUpdateRoles(req.body);

        const { id } = req.params;
        const { roles } = req.body;

        const user = await usersService.updateUserRoles(id, roles);
        res.json({ message: 'User roles updated', user });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all available roles.
 */
export async function getAllRoles(req, res, next) {
    try {
        const roles = await usersService.getAllRoles();
        res.json({ roles });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all laboratories.
 */
export async function getAllLaboratories(req, res, next) {
    try {
        const laboratories = await usersService.getAllLaboratories();
        res.json({ laboratories });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a doctor's laboratory assignments.
 */
export async function getDoctorLaboratories(req, res, next) {
    try {
        const { id } = req.params;
        const laboratories = await usersService.getDoctorLaboratories(id);
        res.json({ laboratories });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a doctor's laboratory assignments.
 */
export async function updateDoctorLaboratories(req, res, next) {
    try {
        validateUpdateDoctorLaboratories(req.body);

        const { id } = req.params;
        const { laboratory_ids } = req.body;

        const laboratories = await usersService.updateDoctorLaboratories(id, laboratory_ids);
        res.json({ message: 'Doctor laboratories updated', laboratories });
    } catch (err) {
        next(err);
    }
}
