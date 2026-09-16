import express from 'express';
import cors from 'cors';

const app = express();

import errorHandler from './src/middleware/error.middleware.js';

// Main Modular Routes
import authRouter from './src/modules/auth/routes.js';
/*
const userRouter = require("./src/modules/users/routes.js");
const cashierRouter = require("./src/modules/cashier/routes.js");
const laboratoryRouter = require("./src/modules/laboratory/routes.js");
const inventoryRouter = require("./src/modules/inventory/routes.js");
const accountingRouter = require("./src/modules/accounting/routes.js");
*/

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to the PerPoly API');
});


// Set-up Main Routes
app.use('/auth', authRouter);
/*
app.use('/user', userRouter);
app.use('/cashier', cashierRouter);
app.use('/laboratory', laboratoryRouter);
app.use('/inventory', inventoryRouter);
app.use('/accounting', accountingRouter);
*/

app.use(errorHandler);

export default app;