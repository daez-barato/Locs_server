import { RequestHandler, Request, Response } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest } from "../middleware/authenticateToken";
import { parse } from "path";

const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const getEventInformation: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId }  = req.params;
    const client = await pool.connect();
    
    try {
        const eventInfo = await client.query(`
            SELECT 
                e.expire_date,
                e.locked,
                e.decided,
                e.public,
                e.creator_id AS event_creator_id,
                u.username AS event_creator,
                t.id AS template_id,
                t.title,
                t.description,
                t.creator_id AS template_creator_id,
                t.public AS template_posted
            FROM events e
            JOIN templates t ON e.template = t.id
            JOIN users u ON e.creator_id = u.id
            WHERE e.id = $1;
        `, [eventId]);
        
        if (eventInfo.rows.length === 0) {
            console.error('Event not found');
            res.status(404).json({ message: "Event not found" });
            return;
        };

        const questions = await client.query(`
            SELECT 
                q.title AS question,
                o.title AS option
            FROM questions q
            JOIN options o ON q.template_id = o.template_id AND q.title = o.question
            WHERE q.template_id = $1;
        `, [eventInfo.rows[0].template_id]);

        if (questions.rows.length === 0) {
            console.error('No questions found for this event');
            res.status(404).json({ message: "No questions found for this event" });
            return;
        };

        // Transform the rows into a more structured format

        const structuredQuestions = questions.rows.reduce((acc, row) => {
            if (!acc[row.question]) {
                acc[row.question] = [];
            }
            acc[row.question].push(row.option);
            return acc;
        }, {});

        const result = {
            ...eventInfo.rows[0],
            questions: structuredQuestions,
        };

        console.log("Event information retrieved successfully:", result);
        
        res.status(200).json(result);

    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return
    } finally {
        client.release();
    };
}

export const postEvent: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    let { optionsDict, title, description, image, privacy, time, templateId } = req.body;
    const client = await pool.connect();
  
    const is_public = privacy === "Public";
    const cleanTime = time.replace(/,\s*/g, ' ');
  
    try {
        await client.query(`BEGIN;`);
    
        // 1. Insert Template
        if (!templateId) {
            const { rows: templateRows } = await client.query(
                `INSERT INTO templates (title, description, creator_id)
                VALUES ($1, $2, $3) RETURNING id;`,
                [title, description, req.user?.id]
            );
            if (templateRows.length === 0) {
                throw new Error("Failed to create template");
            }
            templateId = templateRows[0].id;

            // 2. Insert Questions + Options
            const questionKeys = Object.keys(optionsDict);
        
            for (const question of questionKeys) {
        
                await client.query(
                `INSERT INTO questions (template_id, title) VALUES ($1, $2);`,
                [templateId, question]
                );
        
                const options = optionsDict[question];
        
                for (const option of options){
                    await client.query(
                        `INSERT INTO options (question, template_id, title)
                        VALUES ($1, $2, $3);`,
                        [question, templateId, option]
                    );
                }
            }
        }
    
        
    
        // 3. Insert Event
        const { rows: eventRows } = await client.query(
            `INSERT INTO events (creator_id, template, expire_date, public)
            VALUES ($1, $2, now() + $3::interval, $4) RETURNING id;`,
            [req.user?.id, templateId, cleanTime, is_public]
        );
    
        if (eventRows.length === 0) {
            throw new Error("Failed to create event");
        }
    
        await client.query(`COMMIT;`);
        res.status(201).json({ id: eventRows[0].id });
    
    } catch (err) {
        await client.query(`ROLLBACK;`);
        console.error("Database error:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
};


export const getEventBets: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

    try {

        const bets = await pool.query(`
            SELECT 
                b.user_id,
                u.username,
                b.question,
                b.option,
                b.amount,
                b.payout
            FROM bets b
            JOIN users u ON b.user_id = u.id
            WHERE b.event_id = $1;
        `, [eventId]);
        
        console.log("Bets retrieved successfully:", bets.rows);

        res.status(200).json(bets.rows);
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const placeBet: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { question, option } = req.body;
    const amount = parseFloat(req.body.amount);

    if (!question || !option || isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: "Invalid bet data" });
        return;
    }

    const client = await pool.connect();

    try {
        const eventCheck = await client.query(`
            SELECT locked, template FROM events WHERE id = $1;
        `, [eventId]);

        if (eventCheck.rows.length === 0 || eventCheck.rows[0].locked) {
            res.status(400).json({ error: "Event does not exist or is locked" });
            return;
        }

        await client.query('BEGIN');

        // First: Deduct coins if sufficient
        const balanceUpdate = await client.query(`
            UPDATE users SET coins = coins - $1 
            WHERE id = $2 AND coins >= $1
            RETURNING coins;
        `, [amount, req.user?.id]);

        if (balanceUpdate.rows.length === 0) {
            throw new Error('Insufficient coins for this bet');
        }

        // Then: Insert or update bet
        const bet = await client.query(`
            INSERT INTO bets (event_id, user_id, template_id, question, option, amount)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (event_id, user_id, question, option)
            DO UPDATE SET amount = EXCLUDED.amount
            WHERE EXCLUDED.amount > bets.amount
            RETURNING *;
        `, [eventId, req.user?.id, eventCheck.rows[0].template, question, option, amount]);

        if (bet.rows.length === 0) {
            throw new Error("You already placed a higher or equal bet on this option");
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Bet placed successfully", coins: balanceUpdate.rows[0].coins, success: true });
        console.log("Bet placed successfully:", true);
        return;

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Database error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
        return;
    } finally {
        client.release();
    }
};

export const lockEvent: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

    try {

        const lock = await pool.query(`
            UPDATE events
            SET
                locked = TRUE
            WHERE id = $1 AND creator_id = $2
            RETURNING *;
        `, [eventId, req.user?.id]);

        if (lock.rowCount === 0) {
            res.status(404).json({ message: 'Event not found or not authorized' });
            return
        }

        res.status(200).json({ message: 'Event locked successfully' });
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const endEvent: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { winningOptions } = req.body as {
        winningOptions: Record<string, string>;
    };

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const event = await client.query(`
            UPDATE events
            SET
                decided = TRUE
            WHERE id = $1 AND creator_id = $2 AND decided = FALSE
            RETURNING *;
        `, [eventId, req.user?.id]);

        if (event.rowCount === 0) {
            throw new Error('Event not found or not authorized or already decided');
        };

        for (const [question, correctOption] of Object.entries(winningOptions)){
            // Obter todas as apostas feitas nesta pergunta (independentemente da opção)
            const allBets = await client.query(`
                SELECT user_id, amount, option
                FROM bets
                WHERE event_id = $1 AND question = $2
            `, [eventId , question]);

            // Obter todas as apostas corretas
            const correctBets = allBets.rows.filter(
                bet => bet.option === correctOption
            );

            const totalWinningBet = correctBets.reduce((sum, bet) => sum + Number(bet.amount), 0);
            const totalPool = allBets.rows.reduce((sum, bet) => sum + Number(bet.amount), 0);

            if (totalWinningBet === 0) {
                // 🟡 Ninguém acertou → devolver apostas a todos
                for (const bet of allBets.rows) {
                    await client.query(`
                        UPDATE users
                        SET coins = coins + $1
                        WHERE id = $2
                    `, [parseInt(bet.amount), bet.user_id]);

                    await client.query(`
                        UPDATE bets
                        SET payout = $1
                        WHERE event_id = $2 AND question = $3 AND user_id = $4 AND option = $5;
                    `, [parseInt(bet.amount), eventId, question, bet.user_id, bet.option]);
                }
            } else {
                // ✅ Alguém acertou → distribuir o prémio proporcionalmente entre os vencedores
                for (const bet of allBets.rows) {
                    let share = 0;

                    const isCorrect = correctBets.some(b =>
                        b.user_id === bet.user_id && b.option === bet.option
                    );

                    if (isCorrect) {
                        share = Math.floor((Number(bet.amount) / totalWinningBet) * totalPool);

                        await client.query(`
                        UPDATE users
                        SET coins = coins + $1
                        WHERE id = $2
                        `, [share, bet.user_id]);
                    }

                    await client.query(`
                        UPDATE bets
                        SET payout = $1
                        WHERE event_id = $2 AND question = $3 AND user_id = $4 AND option = $5;
                    `, [share, eventId, question, bet.user_id, bet.option]);
                    }     
            };
        };

        await client.query('COMMIT');
        res.status(200).json({ message: 'Event ended and rewards distributed successfully' });
        
    } catch(err){
        await client.query('ROLLBACK');
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};

export const postTemplate: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { template } = req.params;

    try {

        // Update the template to be public
        await pool.query(`
            UPDATE templates SET public = TRUE WHERE id = $1 AND creator_id = $2;
        `, [template, req.user?.id]);

        res.status(200).json({ message: 'Template posted successfully' });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTemplate: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;

    try {
        const template = await pool.query(`
            SELECT 
                t.id AS template_id,
                t.title,
                t.description,
                t.creator_id AS template_creator_id,
                t.image_url
            FROM templates t
            WHERE t.id = $1 AND (t.public = TRUE OR t.creator_id = $2);
        `, [templateId, req.user?.id]);

        if (template.rows.length === 0) {
            res.status(404).json({ message: "Template not found" });
            return;
        };

        // Fetch questions and options for the template
        const questions = await pool.query(`
            SELECT 
                q.title AS question,
                o.title AS option
            FROM questions q
            JOIN options o ON q.template_id = o.template_id AND q.title = o.question
            WHERE q.template_id = $1;
        `, [templateId]);

        if (questions.rows.length === 0) {
            res.status(404).json({ message: "No questions found for this template" });
            return;
        };

        const optionsDict: { [key: string]: string[] } = {};

        for (const row of questions.rows) {
            if (!optionsDict[row.question]) {
                optionsDict[row.question] = [];
            };
            optionsDict[row.question].push(row.option);
        };

        console.log("Template retrieved successfully:", template.rows);
        console.log("Questions and options:", optionsDict);
        res.status(200).json({template: template.rows[0], questions: optionsDict });
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserLiveBets : RequestHandler = async (req: AuthenticatedRequest, res: Response) => {

    try {
        const liveBets = await pool.query(`
            SELECT DISTINCT
                e.id,
                e.expire_date,
                t.title,
                t.description,
                e.locked,
                t.image_url as thumbnail,
                CASE 
                    WHEN e.creator_id = $1 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT(DISTINCT c.user_id) as participants_count
            FROM bets b
            JOIN events e ON b.event_id = e.id
            JOIN templates t ON e.template = t.id
            LEFT JOIN bets c ON e.id = c.event_id
            WHERE b.user_id = $1 AND e.decided = FALSE
            GROUP BY e.id, t.id
            ORDER BY e.expire_date ASC;
        `, [req.user?.id]);

        console.log("User live bets retrieved successfully:", liveBets.rows);
        res.status(200).json(liveBets.rows);
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    } 
};

export const getUserLiveEvents: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const liveEvents = await pool.query(`
            SELECT
                e.id,
                e.expire_date,
                t.title,
                t.description,
                e.locked,
                t.image_url as thumbnail,
                CASE 
                    WHEN e.creator_id = $1 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT( DISTINCT b.user_id) as participants_count
            FROM events e
            JOIN templates t ON e.template = t.id
            LEFT JOIN bets b ON e.id = b.event_id
            WHERE e.creator_id = $1 AND e.decided = FALSE
            GROUP BY e.id, t.id
            ORDER BY e.expire_date ASC;
        `, [req.user?.id]);

        console.log("User live events retrieved successfully:", liveEvents.rows);
        res.status(200).json(liveEvents.rows);
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    } 
};

export const getUserFollowingPosts: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const followingPosts = await pool.query(`
            SELECT 
                e.id,
                e.expire_date,
                t.title,
                t.description,
                e.locked,
                t.image_url as thumbnail,
                u.username AS creator_username,
                FALSE AS is_creator,
                COUNT(DISTINCT b.user_id) as participants_count
            FROM events e
            JOIN templates t ON e.template = t.id
            JOIN users u ON e.creator_id = u.id
            JOIN followers f ON f.follower_id = $1 AND f.followed_id = e.creator_id
            LEFT JOIN bets b ON e.id = b.event_id
            WHERE e.decided = FALSE AND e.creator_id != $1
            GROUP BY e.id, t.id, u.username
            ORDER BY e.expire_date ASC;
        `, [req.user?.id]);

        console.log("User following posts retrieved successfully:", followingPosts.rows);
        res.status(200).json({ posts: followingPosts.rows });
        
    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
