import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
    user?: { id: string } & JwtPayload; // Add a `user` property to the request object
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        res.status(401).json({ error: "Missing token" });
        return;
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.TOKEN_SECRET || "", (err, user) => {
        if (err) {
            res.status(403).json({ error: "Invalid token" });
            console.log("Token invalid: ", token );
            return;
        }
        req.user = user as { id: string } & JwtPayload; // Attach the decoded user to the request object
        
        next();
    });
};

export default authenticateToken;