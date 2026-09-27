import express from 'express';
import db from '../../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const { rows } = await db.query('SELECT NOW()') ;
    const timeResult = rows && rows.length > 0 ? rows[0].now : "No rows returned";

    res.json({ message: "Database connection successful!", time: timeResult });
});

export default router;