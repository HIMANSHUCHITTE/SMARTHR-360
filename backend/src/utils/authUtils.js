const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (candidatePassword, passwordHash) => {
    return bcrypt.compare(candidatePassword, passwordHash);
};

const signAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

const signRefreshToken = (payload) => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = {
    hashPassword,
    comparePassword,
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
