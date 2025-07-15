import {workerData, parentPort} from "node:worker_threads";

// process.on("message", (message : {number: number}) => {
//     process.send(`hello ${message.number}`);
//     process.exit();
// })

const data = workerData.number;

parentPort.postMessage({
    result: `hello ${data}`
})