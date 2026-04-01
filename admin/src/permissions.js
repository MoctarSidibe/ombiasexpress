// ── Permission helpers ────────────────────────────────────────────────────────

export const getAdminUser = () => {
    try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); } catch { return null; }
};

export const isSuperAdmin = () => {
    const u = getAdminUser();
    return u?.role === 'admin';
};

export const getPermissions = () => {
    const u = getAdminUser();
    if (u?.role === 'admin') return ['*'];          // super admin — all permissions
    return u?.staffData?.permissions || [];
};

export const can = (permission) => {
    const perms = getPermissions();
    return perms.includes('*') || perms.includes(permission);
};
