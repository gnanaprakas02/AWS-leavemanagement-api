import * as jwt from "jsonwebtoken";

// Define the secret (this must match what you’ll store in AWS Secrets Manager)
const JWT_SECRET: string = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4";

// Define the payload type (customize as needed)
interface TokenPayload {
    sub: string; // Subject (e.g., user email or ID)
    iat?: number; // Issued at (optional, auto-added by jsonwebtoken)
    [key: string]: any; // Allow additional claims
}

// Create the payload
const payload: TokenPayload = {
    sub: "user@example.com", // Simulate a user
};

// Generate the token
const token: string = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "5min", // Token expires in 1 hour
});

// Output the token
console.log("Generated JWT Token:");
console.log(token);