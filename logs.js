import fs from 'fs';
const log = fs.readFileSync('/tmp/task-5820c900-92d8-442a-be4e-9d41719aa1ec-task-175.log', 'utf8');
console.log(log.substring(log.length - 1000));
