# LINE OA Sender

ระบบส่งข้อความและรูปภาพผ่าน LINE Official Account หลายตัว พร้อมหน้า Admin สำหรับจัดการ UserOA/botlineOA และหน้า UserOA สำหรับส่งข้อความเฉพาะ botlineOA ที่ได้รับมอบหมาย

## ความสามารถหลัก

- รับ LINE webhook แยกต่อ botlineOA ที่ `/webhook/line/:webhookKey`
- ตรวจ `X-Line-Signature` ก่อนบันทึกข้อมูล
- Admin เพิ่ม botlineOA ได้ไม่จำกัดในระดับโปรแกรม และ assign ให้ UserOA ผ่าน checkbox
- UserOA ส่งได้เฉพาะ botlineOA ที่ได้รับมอบหมาย
- เก็บผู้รับจาก webhook เป็นชื่อผู้ใช้หรือชื่อกลุ่ม แทนการแสดง UID และแยกข้อมูลตาม botlineOA
- ส่งข้อความ, รูปภาพ, หรือข้อความพร้อมรูป ผ่าน LINE Push API
- อัปโหลดรูปขึ้น Cloudinary เพื่อให้ได้ HTTPS URL สำหรับ LINE
- ตั้งเวลาส่งอัตโนมัติวันละครั้งตามเวลา `Asia/Bangkok`
- ส่งข้อความไปยังกลุ่มที่ botlineOA อยู่ พร้อมแท็กสมาชิกที่ระบบพบจาก webhook ได้ ทั้งแบบทันทีและตั้งเวลา
- GitHub Actions เรียก `/internal/send-due` เป็นระยะ เพื่อตรวจงานที่ถึงเวลาโดยไม่ต้องใช้ Render Cron

## ตั้งค่า Environment

คัดลอกจาก `.env.example` แล้วใส่ค่าจริง:

```bash
DATABASE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_PASSWORD=
SESSION_SECRET=
CRON_SECRET=
APP_BASE_URL=
PORT=10000
```

## รันด้วย Docker Compose

ต้องติดตั้ง Docker Engine/Desktop และ Docker Compose v2 ก่อน จากนั้นเตรียม environment file:

```powershell
Copy-Item .env.example .env
```

ตั้งค่า `POSTGRES_PASSWORD` เป็นรหัสสุ่มแบบ hex (เช่น `openssl rand -hex 32`), กรอกค่า Cloudinary, `ADMIN_PASSWORD`, `SESSION_SECRET` และ `CRON_SECRET` ใน `.env` แล้วกำหนด `APP_BASE_URL` เป็น HTTPS URL จริงของเว็บเมื่อ deploy หลัง reverse proxy ที่ดูแล TLS ให้ ตั้ง `DATABASE_SSL=false` สำหรับ PostgreSQL ใน Compose นี้

เริ่มระบบ:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

หน้าเว็บจะอยู่ที่ `http://localhost:10000` (เปลี่ยนพอร์ตภายนอกได้ด้วย `HOST_PORT`) และ health endpoint คือ `/health` แอปจะเริ่มหลัง PostgreSQL ผ่าน health check แล้ว และสร้าง/ปรับ schema ตอนเริ่มทำงาน ข้อมูล PostgreSQL เก็บใน named volume `postgres_data` จึงอยู่ต่อเมื่อ recreate container; อย่าใช้ `docker compose down -v` หากยังต้องเก็บข้อมูล

ก่อนเปิดรับ LINE webhook บน production ต้องเผยแพร่บริการผ่านโดเมน HTTPS ที่เข้าถึงจากอินเทอร์เน็ตได้ โดย reverse proxy/TLS termination ส่งต่อมายังพอร์ตของแอป และตั้ง `APP_BASE_URL` ให้ตรงกับโดเมนนั้น จากนั้นตั้ง webhook URL ที่ระบบแสดงใน LINE Developers Console การตั้งเวลาให้ workflow `.github/workflows/send-due.yml` เรียก `APP_BASE_URL` พร้อม GitHub Secrets `APP_BASE_URL` และ `CRON_SECRET` ตามหัวข้อด้านล่าง

สำรองฐานข้อมูลก่อนอัปเดตและเก็บไฟล์สำรองไว้นอก container:

```powershell
docker compose exec -T db pg_dump -U line_oa_sender line_oa_sender > backup.sql
```

หากเปลี่ยน `POSTGRES_USER` หรือ `POSTGRES_DB` ให้ปรับค่าในคำสั่งสำรองด้วย การเริ่มแอปครั้งแรกกับฐานข้อมูลเก่าจะรัน migration `multi_bot_v1_reset` ซึ่งล้างข้อมูล recipients, uploads, campaigns, delivery logs และ webhook events เดิมตามเจตนาของ migration ในโค้ดนี้ ดังนั้นให้สำรองก่อนเชื่อมฐานข้อมูลเดิม

## รันในเครื่อง

```bash
npm.cmd install
npm.cmd run build
npm.cmd start
```

สำหรับหน้า UI ระหว่างพัฒนา:

```bash
npm.cmd run dev
```

## Deploy บน Render

1. Push โปรเจกต์นี้ขึ้น GitHub/GitLab/Bitbucket
2. ที่ Render เลือก New > Blueprint แล้วเชื่อม repository นี้ เพื่อให้ Render อ่าน `render.yaml` และ build Dockerfile
3. เลือก Free และกรอก Cloudinary keys, `ADMIN_PASSWORD`, `CRON_SECRET` ในขั้นตอนสร้าง Blueprint
4. หลัง service ได้ URL แล้ว เพิ่ม `APP_BASE_URL` ใน Environment ของ Render เป็น URL จริง เช่น `https://line-oa-sender.onrender.com` แล้ว deploy ใหม่
5. Login ด้วย `ADMIN_PASSWORD`
6. เพิ่ม botlineOA ในหน้า Admin แล้ว copy webhook URL ของ bot นั้นไปตั้งใน LINE Developers
7. เปิดใช้งาน webhook ใน LINE Developers Console
8. เพิ่ม UserOA และ assign botlineOA ให้ UserOA ผ่าน checkbox
9. ให้ผู้ใช้ทัก OA หรือให้ OA ถูกเพิ่มเข้ากลุ่มก่อน รายชื่อจึงจะขึ้นใน UI ของ botlineOA นั้น

Blueprint นี้ตั้ง Render Web Service, Dockerfile และ Render Postgres เป็น `free` เพื่อทดลองเท่านั้น ฐานข้อมูลฟรีของ Render หมดอายุหลัง 30 วัน และเว็บอาจ sleep เมื่อไม่มี traffic; อย่าใช้เก็บข้อมูลจริงหรือพึ่งพา uptime สำหรับการส่งแจ้งเตือนสำคัญ

## ตั้งเวลาแบบฟรีด้วย GitHub Actions

Render Cron ไม่มีแผนฟรี จึงใช้ workflow ใน `.github/workflows/send-due.yml` แทน โดย workflow จะเรียกเว็บทุก 10 นาทีแล้วระบบจะส่งเฉพาะเมื่อถึงเวลารายวันที่ตั้งไว้

หลัง deploy Render แล้ว ให้เพิ่ม Repository secrets ใน GitHub:

- `APP_BASE_URL` = URL ของ Render เช่น `https://line-oa-sender.onrender.com`
- `CRON_SECRET` = ค่าเดียวกับ `CRON_SECRET` ที่ตั้งไว้ใน Render

ข้อจำกัดของแบบฟรี:

- Render Free Web Service อาจหน่วงตอนตื่นจาก sleep
- Render Free Postgres หมดอายุหลังสร้าง 30 วัน ถ้าต้องการฟรีแบบเก็บข้อมูลยาวกว่า ให้ใช้ Supabase/Neon free แล้วใส่ connection string ใน `DATABASE_URL` แทน Render Postgres
- LINE OA ยังคิดตามโควตาข้อความของ LINE เอง ไม่เกี่ยวกับ Render

## หมายเหตุการส่งทั้งหมด

คำว่า “ส่งทุกกลุ่ม” ในระบบนี้หมายถึงกลุ่มที่ระบบเคยได้รับจาก webhook และ botlineOA ยังเป็นสมาชิกอยู่ ไม่ใช่ LINE broadcast ไปหาเพื่อน OA ทั้งหมด

## การแท็กสมาชิกในกลุ่ม

- ระบบจำสมาชิกของแต่ละกลุ่มเมื่อสมาชิกส่งกิจกรรมที่ทำให้ LINE ส่ง webhook มาให้ botlineOA
- เลือกกลุ่มเป้าหมาย แล้วเลือกสมาชิกที่ต้องการแท็ก (สูงสุด 20 คนต่อกลุ่ม) ก่อนกดส่งทันทีหรือบันทึกเวลาส่ง
- รายชื่อสมาชิกจะแสดงเท่าที่ระบบเคยเห็นผ่าน webhook; สมาชิกที่ยังไม่เคยมีเหตุการณ์ webhook จะยังเลือกแท็กไม่ได้
- LINE กำหนดให้ OA ผู้ส่งและสมาชิกที่ถูกแท็กต้องอยู่ในกลุ่มปลายทาง
