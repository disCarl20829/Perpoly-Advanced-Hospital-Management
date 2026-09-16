import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Authentication Route active');
});

export default router;