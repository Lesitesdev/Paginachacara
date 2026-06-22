'use strict';
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const express=require('express');
const multer=require('multer');
const compression=require('compression');
const sharp=require('sharp');
const {DatabaseSync}=require('node:sqlite');

const ROOT=__dirname, DATA=path.join(ROOT,'data'), UPLOADS=path.join(ROOT,'uploads');
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(UPLOADS,{recursive:true});
const db=new DatabaseSync(path.join(DATA,'infinity-dreams.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL CHECK(type IN ('image','video')),url TEXT NOT NULL,title TEXT NOT NULL,alt TEXT NOT NULL DEFAULT '',featured INTEGER NOT NULL DEFAULT 0,position INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS availability(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL UNIQUE,status TEXT NOT NULL CHECK(status IN ('available','pending','booked','blocked')),note TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS booking_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',event_type TEXT NOT NULL,date TEXT NOT NULL,guests INTEGER NOT NULL DEFAULT 0,message TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','approved','declined')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);

const scrypt=(password,salt)=>crypto.scryptSync(password,salt,64).toString('hex');
function seed(){
  if(!db.prepare("SELECT 1 FROM settings WHERE key='admin_user'").get()){
    const salt=crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO settings(key,value) VALUES (?,?),(?,?),(?,?)').run('admin_user',process.env.ADMIN_USER||'admin','admin_salt',salt,'admin_hash',scrypt(process.env.ADMIN_PASSWORD||'Infinity@2026!',salt));
  }
  if(!db.prepare('SELECT 1 FROM media LIMIT 1').get()){
    const items=[['image','/img/Galeria de fotos/Piscina.JPG','Piscina','Piscina do Espaço Infinity Dreams'],['image','/img/Galeria de fotos/Salao.JPG','Salão de eventos','Salão coberto do Espaço Infinity Dreams'],['image','/img/Galeria de fotos/Cozinha.JPG','Cozinha equipada','Cozinha equipada para eventos e hospedagem'],['image','/img/Galeria de fotos/Quartos.JPG','Quartos','Quartos para hospedagem em Ribeirão Pires'],['image','/img/Galeria de fotos/Campo.JPG','Campo gramado','Campo gramado e área de lazer'],['image','/img/Galeria de fotos/foto piscina.JPG','Área de lazer','Vista da piscina e da casa']];
    const q=db.prepare('INSERT INTO media(type,url,title,alt,position) VALUES (?,?,?,?,?)');items.forEach((x,i)=>q.run(...x,i));
    db.prepare('INSERT INTO media(type,url,title,alt,featured,position) VALUES (?,?,?,?,?,?)').run('video','/assets/tour-infinity-dreams.mp4','Tour pelo Infinity Dreams','Vídeo de apresentação do espaço',1,99);
  }
}
seed();

const app=express(),sessions=new Map();
app.use(compression());
app.disable('x-powered-by');app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:false}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');next()});
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return[decodeURIComponent(x.slice(0,i).trim()),decodeURIComponent(x.slice(i+1))]}))}
function auth(req,res,next){const token=cookies(req).infinity_session,s=sessions.get(token);if(!s||s.expires<Date.now()){if(token)sessions.delete(token);return res.status(401).json({error:'Acesso não autorizado.'})}s.expires=Date.now()+8*3600e3;next()}
const storage=multer.diskStorage({destination:UPLOADS,filename:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,`${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)}});
const allowed=new Set(['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']);
const upload=multer({storage,limits:{fileSize:100*1024*1024,files:10},fileFilter:(req,file,cb)=>cb(allowed.has(file.mimetype)?null:new Error('Formato não permitido.'),allowed.has(file.mimetype))});

app.get('/api/public',(req,res)=>res.json({media:db.prepare('SELECT id,type,url,title,alt,featured,position FROM media ORDER BY created_at DESC,id DESC').all(),availability:db.prepare("SELECT date,status,note FROM availability WHERE date>=date('now') ORDER BY date LIMIT 180").all()}));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'infinity-dreams'}));
app.post('/api/booking-requests',(req,res)=>{const {name,phone,email='',eventType,date,guests=0,message=''}=req.body;if(!name||!phone||!eventType||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return res.status(400).json({error:'Preencha os campos obrigatórios.'});const slot=db.prepare('SELECT status FROM availability WHERE date=?').get(date);if(slot&&['booked','blocked'].includes(slot.status))return res.status(409).json({error:'Esta data não está disponível.'});const out=db.prepare('INSERT INTO booking_requests(name,phone,email,event_type,date,guests,message) VALUES (?,?,?,?,?,?,?)').run(String(name).slice(0,100),String(phone).slice(0,30),String(email).slice(0,140),String(eventType).slice(0,80),date,Number(guests)||0,String(message).slice(0,1000));db.prepare("INSERT INTO availability(date,status,note) VALUES (?,'pending','Solicitação recebida') ON CONFLICT(date) DO UPDATE SET status='pending',note='Solicitação recebida',updated_at=CURRENT_TIMESTAMP").run(date);res.status(201).json({ok:true,id:Number(out.lastInsertRowid)})});
app.post('/api/admin/login',(req,res)=>{const user=db.prepare("SELECT value FROM settings WHERE key='admin_user'").get().value,salt=db.prepare("SELECT value FROM settings WHERE key='admin_salt'").get().value,hash=db.prepare("SELECT value FROM settings WHERE key='admin_hash'").get().value;if(req.body.username!==user||!crypto.timingSafeEqual(Buffer.from(scrypt(req.body.password||'',salt)),Buffer.from(hash)))return res.status(401).json({error:'Usuário ou senha inválidos.'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+8*3600e3});res.setHeader('Set-Cookie',`infinity_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);res.json({ok:true})});
app.post('/api/admin/logout',auth,(req,res)=>{sessions.delete(cookies(req).infinity_session);res.setHeader('Set-Cookie','infinity_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.json({ok:true})});
app.get('/api/admin/dashboard',auth,(req,res)=>res.json({media:db.prepare('SELECT * FROM media ORDER BY created_at DESC,id DESC').all(),availability:db.prepare('SELECT * FROM availability ORDER BY date').all(),requests:db.prepare('SELECT * FROM booking_requests ORDER BY created_at DESC').all()}));
app.post('/api/admin/media',auth,upload.array('files',10),async(req,res,next)=>{try{const {title='Infinity Dreams',alt='',featured='0'}=req.body,q=db.prepare('INSERT INTO media(type,url,title,alt,featured,position) VALUES (?,?,?,?,?,?)'),max=db.prepare('SELECT COALESCE(MAX(position),0) n FROM media').get().n;const files=await Promise.all(req.files.map(async f=>{if(!f.mimetype.startsWith('image/'))return{...f,type:'video',publicName:f.filename};const publicName=`${path.parse(f.filename).name}.webp`,optimized=path.join(UPLOADS,publicName);await sharp(f.path).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(optimized);fs.rmSync(f.path,{force:true});return{...f,type:'image',publicName}}));const rows=files.map((f,i)=>{const url=`/uploads/${f.publicName}`;const out=q.run(f.type,url,String(title).slice(0,120),String(alt||title).slice(0,180),featured==='1'?1:0,max+i+1);return{id:Number(out.lastInsertRowid),type:f.type,url}});res.status(201).json({ok:true,media:rows})}catch(err){next(err)}});
app.delete('/api/admin/media/:id',auth,(req,res)=>{const row=db.prepare('SELECT url FROM media WHERE id=?').get(req.params.id);if(!row)return res.status(404).json({error:'Mídia não encontrada.'});db.prepare('DELETE FROM media WHERE id=?').run(req.params.id);if(row.url.startsWith('/uploads/'))fs.rm(path.join(ROOT,row.url),{force:true},()=>{});res.json({ok:true})});
app.put('/api/admin/availability/:date',auth,(req,res)=>{const {status,note=''}=req.body;if(!['available','pending','booked','blocked'].includes(status))return res.status(400).json({error:'Status inválido.'});db.prepare('INSERT INTO availability(date,status,note) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=CURRENT_TIMESTAMP').run(req.params.date,status,String(note).slice(0,180));res.json({ok:true})});
app.delete('/api/admin/availability/:date',auth,(req,res)=>{db.prepare('DELETE FROM availability WHERE date=?').run(req.params.date);res.json({ok:true})});
app.patch('/api/admin/requests/:id',auth,(req,res)=>{if(!['new','contacted','approved','declined'].includes(req.body.status))return res.status(400).json({error:'Status inválido.'});db.prepare('UPDATE booking_requests SET status=? WHERE id=?').run(req.body.status,req.params.id);const request=db.prepare('SELECT date FROM booking_requests WHERE id=?').get(req.params.id);if(request&&req.body.status==='approved')db.prepare("INSERT INTO availability(date,status,note) VALUES (?,'booked','Reserva confirmada') ON CONFLICT(date) DO UPDATE SET status='booked',note='Reserva confirmada',updated_at=CURRENT_TIMESTAMP").run(request.date);res.json({ok:true})});
app.put('/api/admin/password',auth,(req,res)=>{if(!req.body.password||req.body.password.length<10)return res.status(400).json({error:'Use pelo menos 10 caracteres.'});const salt=crypto.randomBytes(16).toString('hex');db.prepare("UPDATE settings SET value=? WHERE key='admin_salt'").run(salt);db.prepare("UPDATE settings SET value=? WHERE key='admin_hash'").run(scrypt(req.body.password,salt));res.json({ok:true})});

app.get('/robots.txt',(req,res)=>{const base=process.env.SITE_URL||`${req.protocol}://${req.get('host')}`;res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/admin/\nSitemap: ${base}/sitemap.xml\n`)});
app.get('/sitemap.xml',(req,res)=>{const base=process.env.SITE_URL||`${req.protocol}://${req.get('host')}`;res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`)});
app.get('/',(req,res,next)=>{fs.readFile(path.join(ROOT,'index.html'),'utf8',(err,html)=>{if(err)return next(err);const base=(process.env.SITE_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');res.type('html').set('Cache-Control','no-cache').send(html.replace('<link rel="canonical" href="/">',`<link rel="canonical" href="${base}/">`))})});
app.use('/uploads',express.static(UPLOADS,{maxAge:'7d'}));app.use((req,res,next)=>{if(/^\/(?:data(?:\/|$)|server\.js$|package(?:-lock)?\.json$|\.env)/.test(req.path))return res.sendStatus(404);next()});app.use(express.static(ROOT,{extensions:['html'],index:'index.html',maxAge:'7d',setHeaders:(res,file)=>{if(file.endsWith('.html'))res.setHeader('Cache-Control','no-cache')}}));
app.use((err,req,res,next)=>{console.error(err);if(req.file)fs.rm(req.file.path,{force:true},()=>{});res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:err.message||'Não foi possível concluir a operação.'})});
const port=Number(process.env.PORT)||3000;app.listen(port,()=>console.log(`Infinity Dreams disponível em http://localhost:${port}`));
