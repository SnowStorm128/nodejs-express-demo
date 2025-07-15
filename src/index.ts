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
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { userTable } from './db/schema.js';

// Init variable
const app = express();
const catRouter = express.Router();
const port = 3002;
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

function runWorker(workerData){
    return new Promise((resolve, reject) => {
        const worker = new Worker("./src/hello.js", {
            workerData
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
            if(code !== 0){
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        })
    })
}

// Cat Route
catRouter.get('/', async (req, res) => {
    const { id, ...rest } = getTableColumns(userTable);

    const users = await db.select({
        ...rest
    }).from(userTable);
    console.log('Getting all users from the db: ', users);

    // const ls = child_process.spawn('ls', ['-lh', '/usr']);
    // ls.stdout.on('data', (data) => {
    //     res.write(data.toString())
    // })

    // ls.stdout.on('close', code => {
    //     res.end();
    // })

    // child_process.exec('ls -lh /usr', (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`exec error: ${error}`);
    //         return;
    //     }
    //     res.write(stdout);
    //     res.write(stderr);
    //     res.end();
    // })

    // const hello = child_process.fork("src/hello.js");
    // hello.send({number: 12})
    // hello.on('message', message => {
    //     res.end(message);
    // })

    const worker1 = await runWorker({number: 12}).then((data : {result: number}) => data.result)
    res.end(worker1);
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
