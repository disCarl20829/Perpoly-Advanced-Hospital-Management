import express from 'express';
import cors from 'cors';

const app = express();

import errorHandler from './src/middleware/error.middleware.js';

// Main Modular Routes
import authRouter from './src/modules/auth/routes.js';
import userRouter from './src/modules/users/routes.js';
import cashierRouter from './src/modules/cashier/routes.js';
import laboratoryRouter from './src/modules/laboratory/routes.js';
import inventoryRouter from './src/modules/inventory/routes.js';
import accountingRouter from './src/modules/accounting/routes.js';
import incomeRouter from './src/modules/income/routes.js';
import settingsRouter from './src/modules/settings/routes.js';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to the PerPoly API');
});

// Set-up Main Routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/cashier', cashierRouter);
app.use('/laboratory', laboratoryRouter);
app.use('/inventory', inventoryRouter);
app.use('/accounting', accountingRouter);
app.use('/income', incomeRouter);
app.use('/settings', settingsRouter);

app.use(errorHandler);

export default app;
