const { Setting } = require('../models');

// In-memory cache to avoid DB hit on every request
const cache = {};
const CACHE_TTL = 60 * 1000; // 1 minute

const getSetting = async (key, defaultValue = null) => {
    const now = Date.now();
    if (cache[key] && now - cache[key].timestamp < CACHE_TTL) {
        return cache[key].value;
    }
    const setting = await Setting.findOne({ where: { key } });
    const value = setting ? setting.value : String(defaultValue);
    cache[key] = { value, timestamp: now };
    return value;
};

const updateSetting = async (key, value) => {
    await Setting.update({ value: String(value) }, { where: { key } });
    // Invalidate cache for this key
    delete cache[key];
};

const getAllSettings = async () => {
    return Setting.findAll({ order: [['key', 'ASC']] });
};

module.exports = { getSetting, updateSetting, getAllSettings };
