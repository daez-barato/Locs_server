import { RequestHandler, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authenticateToken";
import { pool } from "../server";
import { createSignedUrl } from "../utils/imageUtils";

export const followRequest: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const followerId = req.user?.id;
  const followedId = req.params.id;

  if (!followerId || !followedId) {
    res.status(400).json({ error: "Missing user IDs" });
    return
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check if the followed user is public
    const { rows } = await client.query(
      "SELECT public FROM users WHERE id = $1 FOR UPDATE",
      [followedId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return
    }

    const isPublic = rows[0].is_public;

    if (isPublic) {
      // 2a. If public → follow immediately
      await client.query(
        `INSERT INTO followers (follower_id, followed_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [followerId, followedId]
      );

      await client.query("COMMIT");
      res.status(200).json({ success: true, following: true });
      return
    } else {
      // 2b. If private → create a follow request
      await client.query(
        `INSERT INTO follow_requests (requester, requested)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [followerId, followedId]
      );

      await client.query("COMMIT");
      res.status(200).json({ success: true, requested: true });
      return
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction error:", err);
    res.status(500).json({ error: "Internal server error" });
    return
  } finally {
    client.release();
  }
};

export const unfollow: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const followerId = req.user?.id;
  const followedId = req.params.id;

  if (!followerId || !followedId) {
    res.status(400).json({ error: "Missing user IDs" });
    return
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check what relationship exists
    const { rows } = await client.query(
      `
      SELECT 
        EXISTS(SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2) AS is_following,
        EXISTS(SELECT 1 FROM follow_requests WHERE requester = $1 AND requested = $2) AS has_requested;
      `,
      [followerId, followedId]
    );

    const { is_following, has_requested } = rows[0];

    if (!is_following && !has_requested) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "No follow relationship found" });
      return
    }

    if (is_following) {
      await client.query(
        `DELETE FROM followers WHERE follower_id = $1 AND followed_id = $2`,
        [followerId, followedId]
      );
    }

    if (has_requested) {
      await client.query(
        `DELETE FROM follow_requests WHERE requester = $1 AND requested = $2`,
        [followerId, followedId]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      status: is_following ? "unfollowed" : "request_canceled",
    });
    return
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in unfollow transaction:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return
  } finally {
    client.release();
  }
};

export const getUserFollowersList: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const followedId = req.params.id;
    const offset = parseInt(req.params.offset || "0", 10);
    
    try { 
        const result = await pool.query(`
            SELECT 
                u.id,
                u.username, 
                u.image_url AS profile_image,
                u.coins,
                u.created_at,
                u.public,
                CASE 
                    WHEN fb.follower_id IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS is_following,
                CASE
                    WHEN fr.requester IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS has_requested
            FROM followers f 
            JOIN users u ON f.follower_id = u.id
            LEFT JOIN followers fb ON fb.follower_id = $3 AND fb.followed_id = u.id
            LEFT JOIN follow_requests fr ON fr.requester = $3 AND fr.requested = u.id
            WHERE f.followed_id = $1
            ORDER BY u.created_at DESC
            LIMIT 20 OFFSET $2;
            `, [followedId, offset, req.user?.id]
        );

        const list = await Promise.all(
        result.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.profile_image) // 1h expiry
            return {
            ...row,
            profile_image: signedUrl,
            };
        })
        );

        res.status(200).json({followersList: list});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const getUserFollowingList: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const followingId = req.params.id;
    const offset = parseInt(req.params.offset || "0", 10);
    
    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.username, 
                u.image_url AS avatar,
                TRUE AS is_following
            FROM followers f 
            JOIN users u ON f.followed_id = u.id
            WHERE f.follower_id = $1
            ORDER BY u.created_at DESC
            LIMIT 20 OFFSET $2;`, [followingId, offset]
        );

        const list = await Promise.all(
        result.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.avatar) // 1h expiry
            return {
            ...row,
            profile_image: signedUrl,
            };
        })
        );

        res.status(200).json({followingList: list});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const acceptFollowRequest: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const requestedId = req.user?.id;
  const requesterId = req.params.id;
  if (!requesterId || !requestedId) {
    res.status(400).json({ error: "Missing user IDs" });
    return
  }

  const client = await pool.connect();

  try {
    
    await client.query('BEGIN');

    // 1️⃣ Apagar o pedido de follow
    const deleteResult = await client.query(
      `DELETE FROM follow_requests
       WHERE requester = $1 AND requested = $2
       RETURNING *;`,
      [requesterId, requestedId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: "No follow request found" });
      return
    }

    // 2️⃣ Criar a linha na tabela followers
    await client.query(
      `INSERT INTO followers (follower_id, followed_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING;`,
      [requesterId, requestedId]
    );

    await client.query('COMMIT');

    res.status(200).json({ success: true, message: "Follow request accepted" });
    return

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error accepting follow request:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return
  } finally {
    client.release();
  }
};

export const rejectFollowRequest: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const requestedId = req.user?.id;
  const requesterId = req.params.id;

  if (!requesterId || !requestedId) {
    res.status(400).json({ error: "Missing user IDs" });
    return
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Apagar o pedido de follow
    const result = await client.query(
      `DELETE FROM follow_requests
       WHERE requester = $1 AND requested = $2
       RETURNING *;`,
      [requesterId, requestedId]
    );

    if (result.rowCount === 0) {
      // Não existia nenhum pedido
      await client.query('ROLLBACK');
      res.status(404).json({ error: "No follow request found" });
      return
    }

    await client.query('COMMIT');

    res.status(200).json({ success: true, message: "Follow request rejected" });
    return
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error rejecting follow request:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return
  } finally {
    client.release();
  }
};

export const updateRequests: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const requests = await pool.query(
        `SELECT
            u.id,
            u.username, 
            u.image_url AS profile_image,
            u.coins,
            u.created_at,
            u.public,
            TRUE AS requester,
            CASE 
                WHEN fo.follower_id IS NOT NULL THEN TRUE
                ELSE FALSE
            END AS is_following,
            CASE 
                WHEN fr.requester IS NOT NULL THEN TRUE
                ELSE FALSE
            END AS has_requested
            FROM follow_requests f
            JOIN users u ON f.requester = u.id
            LEFT JOIN followers fo ON fo.follower_id = $2 AND fo.followed_id = $1
            LEFT JOIN follow_requests fr ON fr.requester = $2 AND fr.requested = $1
            WHERE f.requested = $1;
        `,
        [userId, req.user?.id]
    );

    const requestList = await Promise.all(
    requests.rows.map(async (row) => {
        const signedUrl = await createSignedUrl(row.profile_image) // 1h expiry
        return {
        ...row,
        profile_image: signedUrl,
        };
    })
    );

    res.status(200).json({ success: true, message: "updated request list incoming", list: requestList });
    return
  } catch (err) {
    console.error("Error updating requests:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return
  }
}