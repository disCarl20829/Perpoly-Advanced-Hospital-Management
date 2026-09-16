import { config } from './src/config/env.js'
import app from './app.js';

const PORT = config.server;

app.listen(PORT, function() {
    console.log(`Server is running on port ${PORT}`);
});