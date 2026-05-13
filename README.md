# LINE OA Sender

ระบบส่งข้อความและรูปภาพผ่าน LINE Official Account พร้อมหน้า UI สำหรับเลือกผู้ใช้หรือกลุ่มที่ระบบรู้จักจาก webhook แล้วส่งทันทีหรือตั้งเวลารายวัน

## ความสามารถหลัก

- รับ LINE webhook ที่ `/webhook/line`
- ตรวจ `X-Line-Signature` ก่อนบันทึกข้อมูล
- เก็บผู้รับจาก webhook เป็นชื่อผู้ใช้หรือชื่อกลุ่ม แทนการแสดง UID
- ส่งข้อความ, รูปภาพ, หรือข้อความพร้อมรูป ผ่าน LINE Push API
- เปลี่ยน LINE OA ได้จากหน้า UI โดยกรอก Channel access token และ Channel secret ใหม่
- อัปโหลดรูปขึ้น Cloudinary เพื่อให้ได้ HTTPS URL สำหรับ LINE
- ตั้งเวลาส่งอัตโนมัติวันละครั้งตามเวลา `Asia/Bangkok`
- GitHub Actions เรียก `/internal/send-due` เป็นระยะ เพื่อตรวจงานที่ถึงเวลาโดยไม่ต้องใช้ Render Cron

## ตั้งค่า Environment

คัดลอกจาก `.env.example` แล้วใส่ค่าจริง:

```bash
LINE_CHANNEL_ACCESS_TOKEN= # optional fallback, เปลี่ยนผ่าน UI ได้
LINE_CHANNEL_SECRET= # optional fallback, เปลี่ยนผ่าน UI ได้
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
2. ใช้ `render.yaml` เป็น Blueprint
3. Blueprint นี้ตั้ง Web Service และ Render Postgres เป็น `free` แล้ว และไม่มี Render Cron Job
4. กรอก secret env vars ใน Render โดยตั้ง `CRON_SECRET` เป็นรหัสยาวแบบสุ่ม และจำค่านี้ไว้ใช้กับ GitHub Actions
5. ตั้ง LINE Webhook URL เป็น:

```text
https://YOUR_RENDER_SERVICE.onrender.com/webhook/line
```

6. เปิดใช้งาน webhook ใน LINE Developers Console
7. ให้ผู้ใช้ทัก OA หรือให้ OA ถูกเพิ่มเข้ากลุ่มก่อน รายชื่อจึงจะขึ้นใน UI

หลังเข้า UI แล้ว สามารถเปลี่ยน LINE OA ได้ที่กล่อง “ตั้งค่า LINE OA” โดยกรอกค่าใหม่:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

ถ้าเปลี่ยนเป็น OA ใหม่ ควรติ๊ก “ล้างรายชื่อผู้รับเดิมเมื่อเปลี่ยน OA” เพราะรายชื่อ user/group ที่จับจาก OA เดิมอาจส่งกับ OA ใหม่ไม่ได้ ต้องให้ผู้ใช้ทัก OA ใหม่หรือเพิ่ม OA ใหม่เข้ากลุ่มก่อน

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

คำว่า “ส่งทั้งหมด” ในระบบนี้หมายถึงผู้ใช้และกลุ่มที่ระบบเคยได้รับจาก webhook แล้วเท่านั้น ไม่ใช่ LINE broadcast ไปหาเพื่อน OA ทั้งหมด
