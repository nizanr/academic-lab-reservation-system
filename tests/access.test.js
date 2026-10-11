const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const dir = mkdtempSync(path.join(tmpdir(), 'lab-tests-'));
process.env.DB_PATH = path.join(dir, 'test.sqlite');
process.env.JWT_SECRET = 'test-only-secret';
process.env.SEED_DEMO_DATA = 'false';
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const express = require('express');
let server, base;
const users = [1,2,3,4,5];
const roles = ['STUDENT','STUDENT','ACADEMIC','ACADEMIC','SUPER_ADMIN'];
const tokens = users.map((id,i) => jwt.sign({id, role: roles[i]}, process.env.JWT_SECRET));
async function request(url, index, method='GET', body) {
  const result = await fetch(base + url, {method, headers:{Authorization:`Bearer ${tokens[index]}`, 'Content-Type':'application/json'}, body:body ? JSON.stringify(body):undefined});
  return {status:result.status, body:await result.json()};
}
before(async () => {
  users.forEach((id,i)=>db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(id,`User ${id}`,`u${id}@example.test`,'unused',roles[i]));
  db.prepare('INSERT INTO devices (id,name) VALUES (?,?)').run(1,'Device');
  const app=express();app.use(express.json());app.use('/api/reservations',require('../routes/reservationRoutes'));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  base=`http://127.0.0.1:${server.address().port}/api/reservations`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve)); db.close();rmSync(dir,{recursive:true,force:true});});
const start=new Date(Date.now()+86400000).toISOString();
const end=new Date(Date.now()+86400000+1800000).toISOString();
test('Cross-resource student conflict, adjacent slots and source conflict', async()=>{
  assert.equal((await request('',0,'POST',{type:'APPOINTMENT',resourceId:3,startTime:start,endTime:end})).status,201);
  assert.equal((await request('',0,'POST',{type:'DEVICE',resourceId:1,startTime:start,endTime:end})).status,409);
  assert.equal((await request('',1,'POST',{type:'APPOINTMENT',resourceId:3,startTime:start,endTime:end})).status,409);
  const nextEnd=new Date(new Date(end).getTime()+1800000).toISOString();
  assert.equal((await request('',0,'POST',{type:'DEVICE',resourceId:1,startTime:end,endTime:nextEnd})).status,201);
});
test('Unassigned staff cannot view or approve device bookings; admin can assign', async()=>{
  let result=await request('/incoming',3);
  assert.equal(result.status,200);assert.equal(result.body.length,0);
  const device=db.prepare("SELECT id FROM reservations WHERE type='DEVICE'").get();
  assert.equal((await request(`/${device.id}/status`,3,'PATCH',{status:'APPROVED'})).status,404);
  assert.equal((await request('/admin/devices/1/managers',0,'POST',{userId:4})).status,403);
  assert.equal((await request('/admin/devices/1/managers',4,'POST',{userId:4})).status,200);
  result=await request('/incoming',3);assert.equal(result.body.length,1);
  assert.equal((await request(`/${device.id}/status`,3,'PATCH',{status:'APPROVED'})).status,200);
  assert.equal((await request(`/${device.id}/status`,3,'PATCH',{status:'REJECTED'})).status,409);
});
test('Changed roles apply to old tokens and deleted users cannot access', async()=>{
  assert.equal((await request('/admin/users/4/role',4,'PATCH',{role:'STUDENT'})).status,200);
  assert.equal((await request('/incoming',3)).status,403);
  assert.equal(db.prepare('SELECT count(*) AS n FROM device_managers WHERE user_id=4').get().n,0);
  db.prepare('DELETE FROM users WHERE id=2').run();
  assert.equal((await request('/mine',1)).status,401);
});
