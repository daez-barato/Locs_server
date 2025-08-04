"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endEvent = exports.lockEvent = exports.placeBet = exports.getEventBets = exports.postEvent = exports.getEventInformation = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getEventInformation = async (req, res) => {
    const { eventId } = req.params;
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
                t.creator_id AS template_creator_id
            FROM events e
            JOIN templates t ON e.template = t.id
            JOIN users u ON e.creator_id = u.id
            WHERE e.id = $1;
        `, [eventId]);
        if (eventInfo.rows.length === 0) {
            console.error('Event not found');
            res.status(404).json({ message: "Event not found" });
            return;
        }
        ;
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
        }
        ;
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
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
    finally {
        client.release();
    }
    ;
};
exports.getEventInformation = getEventInformation;
const postEvent = async (req, res) => {
    var _a, _b;
    const { optionsDict, title, description, image, privacy, time } = req.body;
    const client = await pool.connect();
    const is_public = privacy === "public";
    const cleanTime = time.replace(/,\s*/g, ' ');
    try {
        await client.query(`BEGIN;`);
        // 1. Insert Template
        const { rows: templateRows } = await client.query(`INSERT INTO templates (title, description, creator_id)
            VALUES ($1, $2, $3) RETURNING id;`, [title, description, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
        if (templateRows.length === 0) {
            throw new Error("Failed to create template");
        }
        const templateId = templateRows[0].id;
        // 2. Insert Questions + Options
        const questionKeys = Object.keys(optionsDict);
        for (const question of questionKeys) {
            await client.query(`INSERT INTO questions (template_id, title) VALUES ($1, $2);`, [templateId, question]);
            const options = optionsDict[question];
            for (const option of options) {
                await client.query(`INSERT INTO options (question, template_id, title)
                    VALUES ($1, $2, $3);`, [question, templateId, option]);
            }
        }
        // 3. Insert Event
        const { rows: eventRows } = await client.query(`INSERT INTO events (creator_id, template, expire_date, public)
            VALUES ($1, $2, now() + $3::interval, $4) RETURNING id;`, [(_b = req.user) === null || _b === void 0 ? void 0 : _b.id, templateId, cleanTime, is_public]);
        if (eventRows.length === 0) {
            throw new Error("Failed to create event");
        }
        await client.query(`COMMIT;`);
        res.status(201).json({ id: eventRows[0].id });
    }
    catch (err) {
        await client.query(`ROLLBACK;`);
        console.error("Database error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
    finally {
        client.release();
    }
};
exports.postEvent = postEvent;
const getEventBets = async (req, res) => {
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
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getEventBets = getEventBets;
const placeBet = async (req, res) => {
    var _a, _b;
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
        `, [amount, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
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
        `, [eventId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.id, eventCheck.rows[0].template, question, option, amount]);
        if (bet.rows.length === 0) {
            throw new Error("You already placed a higher or equal bet on this option");
        }
        await client.query('COMMIT');
        res.status(201).json({ message: "Bet placed successfully", coins: balanceUpdate.rows[0].coins, success: true });
        console.log("Bet placed successfully:", true);
        return;
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Database error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
        return;
    }
    finally {
        client.release();
    }
};
exports.placeBet = placeBet;
const lockEvent = async (req, res) => {
    var _a;
    const { eventId } = req.params;
    try {
        const lock = await pool.query(`
            UPDATE events
            SET
                locked = TRUE
            WHERE id = $1 AND creator_id = $2
            RETURNING *;
        `, [eventId, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
        if (lock.rowCount === 0) {
            res.status(404).json({ message: 'Event not found or not authorized' });
            return;
        }
        res.status(200).json({ message: 'Event locked successfully' });
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.lockEvent = lockEvent;
const endEvent = async (req, res) => {
    var _a;
    const { eventId } = req.params;
    const { winningOptions } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const event = await client.query(`
            UPDATE events
            SET
                decided = TRUE
            WHERE id = $1 AND creator_id = $2 AND decided = FALSE
            RETURNING *;
        `, [eventId, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
        if (event.rowCount === 0) {
            throw new Error('Event not found or not authorized or already decided');
        }
        ;
        for (const [question, correctOption] of Object.entries(winningOptions)) {
            // Obter todas as apostas feitas nesta pergunta (independentemente da opção)
            const allBets = await client.query(`
                SELECT user_id, amount, option
                FROM bets
                WHERE event_id = $1 AND question = $2
            `, [eventId, question]);
            // Obter todas as apostas corretas
            const correctBets = allBets.rows.filter(bet => bet.option === correctOption);
            const totalWinningBet = correctBets.reduce((sum, bet) => sum + Number(bet.amount), 0);
            const totalPool = allBets.rows.reduce((sum, bet) => sum + Number(bet.amount), 0);
            if (totalWinningBet === 0) {
                // 🟡 Ninguém acertou → devolver apostas a todos
                for (const bet of allBets.rows) {
                    await client.query(`
                        UPDATE users
                        SET coins = coins + $1
                        WHERE id = $2
                    `, [bet.amount, bet.user_id]);
                    await client.query(`
                        UPDATE bets
                        SET payout = $1
                        WHERE event_id = $2 AND question = $3 AND user_id = $4 AND option = $5;
                    `, [bet.amount, eventId, question, bet.user_id, bet.option]);
                }
            }
            else {
                // ✅ Alguém acertou → distribuir o prémio proporcionalmente entre os vencedores
                for (const bet of allBets.rows) {
                    let share = 0;
                    const isCorrect = correctBets.some(b => b.user_id === bet.user_id && b.option === bet.option);
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
            }
            ;
        }
        ;
        await client.query('COMMIT');
        res.status(200).json({ message: 'Event ended and rewards distributed successfully' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        client.release();
    }
};
exports.endEvent = endEvent;
