import * as usersRepo from './repository.js';

/**
 * Get all users.
 * @returns {array} list of users
 */
export async function getAllUsers() {
    return await usersRepo.findAllUsers();
}

/**
 * Get a single user by ID.
 * @param {string} id - UUID
 * @returns {object} user
 */
export async function getUserById(id) {
    const user = await usersRepo.findUserById(id);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }
    return user;
}

/**
 * Update a user's profile.
 * @param {string} id - UUID
 * @param {object} data - { last_name, first_name, middle_name, extra_name, email, preferred_system }
 * @returns {object} updated user
 */
export async function updateUserProfile(id, data) {
    const user = await usersRepo.findUserById(id);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    return await usersRepo.updateUser(id, data);
}

/**
 * Update a user's active status.
 * @param {string} id - UUID
 * @param {boolean} isActive
 * @returns {object} updated user
 */
export async function updateUserActiveStatus(id, isActive) {
    const user = await usersRepo.findUserById(id);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    return await usersRepo.updateUserStatus(id, isActive);
}

/**
 * Update a user's roles.
 * @param {string} userId - UUID
 * @param {array} roles - array of role names
 * @returns {object} updated user
 */
export async function updateUserRoles(userId, roles) {
    const user = await usersRepo.findUserById(userId);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    await usersRepo.replaceUserRoles(userId, roles);
    return await usersRepo.findUserById(userId);
}

/**
 * Get all available roles.
 * @returns {array} list of roles
 */
export async function getAllRoles() {
    return await usersRepo.findAllRoles();
}

/**
 * Get all laboratories.
 * @returns {array} list of laboratories
 */
export async function getAllLaboratories() {
    return await usersRepo.findAllLaboratories();
}

/**
 * Get a doctor's laboratory assignments.
 * @param {string} doctorId - UUID
 * @returns {array} list of laboratory IDs
 */
export async function getDoctorLaboratories(doctorId) {
    const user = await usersRepo.findUserById(doctorId);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    return await usersRepo.findDoctorLaboratories(doctorId);
}

/**
 * Update a doctor's laboratory assignments.
 * @param {string} doctorId - UUID
 * @param {array} laboratoryIds - array of laboratory UUIDs
 * @returns {array} updated list of laboratory IDs
 */
export async function updateDoctorLaboratories(doctorId, laboratoryIds) {
    const user = await usersRepo.findUserById(doctorId);
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    await usersRepo.replaceDoctorLaboratories(doctorId, laboratoryIds);
    return await usersRepo.findDoctorLaboratories(doctorId);
}
