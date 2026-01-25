module.exports = {
    apps: [
        {
            name: "billing",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
        {
            name: "isolir",
            script: "npm",
            args: "run isolir",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
