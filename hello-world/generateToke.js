"use strict";
exports.__esModule = true;
var jwt = require("jsonwebtoken");
// Define the secret (this must match what you’ll store in AWS Secrets Manager)
var JWT_SECRET = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4";
// Create the payload
var payload = {
    sub: "user@example.com"
};
// Generate the token
var token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "5min"
});
// Output the token
console.log("Generated JWT Token:");
console.log(token);
