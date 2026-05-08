# LINE OA Sender

ระบบส่งข้อความและรูปภาพผ่าน LINE Official Account พร้อมหน้า UI สำหรับเลือกผู้ใช้หรือกลุ่มที่ระบบรู้จักจาก webhook แล้วส่งทันทีหรือตั้งเวลารายวัน

## ความสามารถหลัก

- รับ LINE webhook ที่ `/webhook/line`
- ตรวจ `X-Line-Signature` ก่อนบันทึกข้อมูล
- เก็บผู้รับจาก webhook เป็นชื่อผู้ใช้หรือชื่อกลุ่ม แทนการแสดง UID
- ส่งข้อความ, รูปภาพ, หรือข้อความพร้อมรูป ผ่าน LINE Push API
- อัปโหลดรูปขึ้น Cloudinary เพื่อให้ได้ HTTPS URL สำหรับ LINE
- ตั้งเวลาส่งอัตโนมัติวันละครั้งตามเวลา `Asia/Bangkok`
- Render Cron รัน `npm run send:due` เพื่อตรวจงานที่ถึงเวลา

## ตั้งค่า Environment

คัดลอกจาก `.env.example` แล้วใส่ค่าจริง:

```bash
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
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
3. กรอก secret env vars ใน Render
4. ตั้ง LINE Webhook URL เป็น:

```text
https://YOUR_RENDER_SERVICE.onrender.com/webhook/line
```

5. เปิดใช้งาน webhook ใน LINE Developers Console
6. ให้ผู้ใช้ทัก OA หรือให้ OA ถูกเพิ่มเข้ากลุ่มก่อน รายชื่อจึงจะขึ้นใน UI

## หมายเหตุการส่งทั้งหมด

คำว่า “ส่งทั้งหมด” ในระบบนี้หมายถึงผู้ใช้และกลุ่มที่ระบบเคยได้รับจาก webhook แล้วเท่านั้น ไม่ใช่ LINE broadcast ไปหาเพื่อน OA ทั้งหมด
