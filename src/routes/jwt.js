const jwt = require('jsonwebtoken');
const SimpleSchema = require('simpl-schema');
const logger = require("../app/web/logger");
const { lowercaseFirstCharacter, useAuthenticate } = require("./util");
const privateKey = require('../config/appConfigs').adminSecretKey;

const jwtRequestSchema = new SimpleSchema({
    username: String,
    userAgent: String,
});

const handleGetJWT = (requestData, res) => {
    try {
        const cleanedRequest = jwtRequestSchema.clean(requestData);
        jwtRequestSchema.validate(cleanedRequest);

        const token = jwt.sign(
            cleanedRequest,
            privateKey,
            { expiresIn: 60 }
        );

        res.send({ token });
    } catch (e) {
        res.sendStatus(404);
    }
}

module.exports = (app) => {
    app.post(
        '/api/jwt',
        useAuthenticate({
            logger: {
                error: logger.logError,
                warn: logger.logWarning,
            },
        }),
        lowercaseFirstCharacter,
        (req, res) => handleGetJWT(req.body, res));
};
