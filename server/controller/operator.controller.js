import prisma from "../lib/prisma-client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

const JWT_EXPIRES_IN = "7d"; 

export const login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Find operator by username
        const operator = await prisma.operator.findUnique({
            where: { username },
        });

        if (!operator) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, operator.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { username: operator.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            operator: {
                username: operator.username,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Login failed" });
    }
};

export const verifyToken = async (req, res) => {
    res.status(200).json({
        message: "Token is valid",
        operator: {
            username: req.operator.username,
        },
    });
};
