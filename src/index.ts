import 'dotenv/config';
import fs from "node:fs";
import https from "node:https";
// import child_process from "node:child_process";
import { Worker } from 'node:worker_threads';
import compression from "compression";
import express from 'express';
import helmet from 'helmet';
import debugPkg from 'debug';
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import winston from 'winston';
import {createClient} from 'redis';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { userTable } from './db/schema.js';
import { cli } from 'winston/lib/winston/config/index.js';

// Init variable
const app = express();
const catRouter = express.Router();
const port = 3002;
const client = await createClient()
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();
const db = drizzle(process.env.DATABASE_URL!);
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.label({ label: '12' }),
        winston.format.timestamp(),
        winston.format.json()
    ),
    level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info',
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' }),
    ]
});
const mainDebug = debugPkg('app:main');
const errorDebug = debugPkg('app:error');
if (!fs.existsSync("logs/")) {
    fs.mkdirSync("logs/");
}

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
    const currentId = 1;

    const cached = await client.get('user:' + currentId)
    if(cached && typeof cached == 'string'){
        console.log('Getting all users from the cache: ', JSON.parse(cached));
    } else {
        const users = await db.select().from(userTable).where(eq(userTable.id, currentId));
        console.log('Getting all users from the db: ', users);
        client.set('user:' + currentId, JSON.stringify(users), {
            EX: 3600,
        });
    }


    res.end();
})
app.use('/cat', catRouter);

// Default Route
app.get('/', (req, res) => {
    res.render('index', { testVar: 'kit' })
})
app.use('/', express.static('public'));


app.use((err, req, res, next) => {
    logger.error(`Route catched error: ${err}`);
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
    errorDebug('Failed to create https server');
    errorDebug(err);
    process.exit(1);
}
