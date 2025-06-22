import 'dotenv/config';
import fs from "node:fs";
import https from "node:https";
import compression from "compression";
import express from 'express';
import helmet from 'helmet';
import debugPkg from 'debug';
import pino from "pino";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { userTable } from './db/schema';

// Init variable
const app = express();
const catRouter = express.Router();
const port = 3002;
const db = drizzle(process.env.DATABASE_URL!);
const mainDebug = debugPkg('app:main');
const errorDebug = debugPkg('app:error');
if (!fs.existsSync("logs/")) {
  fs.mkdirSync("logs/");
}
const logger = pino({
    level: process.env.LOG_LEVEL ?? "info"
}, pino.destination({
    dest: 'logs/app.log',
}));
const fatalLogger = pino({
    level: process.env.LOG_LEVEL ?? "info"
}, pino.destination({
    dest: 'logs/app.log',
    sync: true,
}));

// Express
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());
app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', process.cwd() + '/views');

// Cat Route
catRouter.get('/', async (req, res) => {
    const { id, ...rest } = getTableColumns(userTable);

    const users = await db.select({
        ...rest
    }).from(userTable);
    console.log('Getting all users from the db: ', users);

    res.send('');
})
app.use('/cat', catRouter);

// Default Route
app.get('/', (req, res) => {
    res.render('index', { testVar: 'kit' })
})
app.use('/', express.static('public'));


app.use((err, req, res, next) => {
    logger.error({
        "message": err.message,
        "stack": err.stack
    })
    errorDebug(err);
    next(err);
})

// Create Server
try {
    const credentials = {
        key: fs.readFileSync(process.env.TLS_KEY_PATH ?? ''),
        cert: fs.readFileSync(process.env.TLS_CERT_PATH ?? '')
    };
    const server = https.createServer(credentials, app);

    server.listen(port, () => {
        mainDebug(`Secure server running on https://localhost:${port}`);
    });

} catch (err) {
    fatalLogger.fatal({
        "message": 'Failed to create https server',
        "stack": err.stack
    })
    errorDebug('Failed to create https server');
    errorDebug(err);
    process.exit(1);
}
