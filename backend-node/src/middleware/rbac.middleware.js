/**
 * RBAC middleware — checks if the authenticated user has at least
 * one of the required roles. Must be used AFTER authenticate().
 *
 * @param  {...string} allowedRoles - roles that can access the route
 * @returns {function} Express middleware
 *
 * @example
 * router.get('/patients', authenticate, authorize('cashier', 'superadmin'), handler);
 */

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ message: 'No roles assigned' });
        }

        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
}

export default authorize;
