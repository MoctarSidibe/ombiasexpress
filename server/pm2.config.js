module.exports = {
    apps: [{
        name:         'ombia-express-api',
        script:       './server.js',
        instances:    1,              // increase to 'max' with Redis configured
        exec_mode:    'fork',
        watch:        false,
        env_production: {
            NODE_ENV: 'production',
            PORT:     5000,
        },
        error_file:   './logs/err.log',
        out_file:     './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        max_memory_restart: '512M',
        restart_delay: 3000,
    }],
};
