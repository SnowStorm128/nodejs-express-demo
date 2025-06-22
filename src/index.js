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
import { eq } from 'drizzle-orm';
import { userTable } from './db/schema';
const app = express();
const catRouter = express.Router();
const port = 3002;
const db = drizzle(process.env.DATABASE_URL);
const mainDebug = debugPkg('app:main');
const errorDebug = debugPkg('app:error');
const logger = pino({
    level: process.env.LOG_LEVEL ?? "info"
}, pino.destination({
    dest: '../app.log',
}));
const fatalLogger = pino({
    level: process.env.LOG_LEVEL ?? "info"
}, pino.destination({
    dest: '../app.log',
    sync: true,
}));
// const client = new Client({
//     user: 'backend',
//     password: fs.readFileSync(process.env.POSTGRESQL_PASSWORD ?? '', {encoding: 'utf8'}),
//     database: 'postgres',
// });
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', process.cwd() + '/views');
catRouter.get('/', async (req, res) => {
    const user = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
    };
    await db.insert(userTable).values(user);
    console.log('New user added!');
    const users = await db.select().from(userTable);
    console.log('Getting all users from the db: ', users);
    await db
        .update(userTable)
        .set({
        age: 31
    })
        .where(eq(userTable.email, user.email));
    const users2 = await db.select().from(userTable);
    console.log('Getting all users from the db: ', users2);
    res.send('');
});
app.use('/cat', catRouter);
app.get('/', (req, res) => {
    res.render('index', { testVar: 'kit' });
});
app.use('/', express.static('public'));
app.use((err, req, res, next) => {
    logger.error({
        "message": err.message,
        "stack": err.stack
    });
    errorDebug(err);
    next(err);
});
try {
    // await client.connect();
    const credentials = {
        key: fs.readFileSync(process.env.TLS_KEY_PATH ?? ''),
        cert: fs.readFileSync(process.env.TLS_CERT_PATH ?? '')
    };
    const server = https.createServer(credentials, app);
    server.listen(port, () => {
        mainDebug(`Secure server running on https://localhost:${port}`);
    });
}
catch (err) {
    fatalLogger.fatal({
        "message": 'Failed to create https server',
        "stack": err.stack
    });
    errorDebug('Failed to create https server');
    errorDebug(err);
    process.exit(1);
}
//# sourceMappingURL=index.js.map