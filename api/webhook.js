const express = require('express');
const line = require('@line/bot-sdk');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// LINE Channel Credentials
const CHANNEL_ACCESS_TOKEN = 'VDP6BNxp4IbJjVLe3MY73lghZwvqKeisykkmCxPLhhUV5xS5QFwt2fkIEWT6lvCOqX4P8Gusw4C+lrJrJEdMrrdYBQ3YJAQSm+hPyKVdiC97X9t7h9fOOhoyAHUbdhJYbaJnMsjyosvbxtQPFmmnTAdB04t89/1O/w1cDnyilFU=';
const CHANNEL_SECRET = 'b16b91dca7e1899f0f0945cad9bd8cae';

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET,
};

const client = new line.Client(config);

// เก็บสถานะของผู้ใช้
const userStates = {};

// ฟังก์ชันตรวจสอบลายเซ็นต์
function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return signature === hash;
}

// ฟังก์ชันจัดการ Event ที่มาจาก LINE
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  // ถ้าเป็นข้อความ "น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า"
  if (event.message.text === 'น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า') {
    userStates[event.source.userId] = { step: 'A1', data: {} };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🎉 ยินดีค่าท่านเทพแบดกฤษ 🏸\n\n` +
            `น้องแบดตี้จะสรุปค่าใช้จ่ายให้นะคะ\n` +
            `แต่ก่อนอื่น รบกวนท่านเทพแบดกฤษกรอกข้อมูลให้ครบหน่อยนะคะ 😊\n\n` +
            `A1=วันที่ตีแบดค่ะ (ตัวอย่าง: 14/07/2568)\n` +
            `A2=จำนวนชั่วโมงที่เล่นแบดค่ะ (ตัวอย่าง: 2)\n` +
            `A3=ค่าจองคอตรอบนี้เท่าไรคะ (ตัวอย่าง: 50)\n` +
            `A4=ใช้ลูกแบดไปกี่ลูกคะ (ตัวอย่าง: 2)\n` +
            `A5=จำนวนผู้เล่นในรอบนี้มีใครบ้างคะ (เช่น P1,P2,P3)`
    });
  }

  // ตรวจสอบสถานะของผู้ใช้
  const state = userStates[event.source.userId];
  if (state) {
    const { step, data } = state;

    if (event.message.text.startsWith('A1=')) {
      data.A1 = event.message.text.split('=')[1];
      state.step = 'A2';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ ขอบคุณสำหรับข้อมูล A1! กรุณากรอก A2 (จำนวนชั่วโมงที่เล่นแบดค่ะ)`,
      });
    }

    if (event.message.text.startsWith('A2=')) {
      data.A2 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A3';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ ขอบคุณสำหรับข้อมูล A2! กรุณากรอก A3 (ค่าจองคอตรอบนี้เท่าไรคะ)`,
      });
    }

    if (event.message.text.startsWith('A3=')) {
      data.A3 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A4';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ ขอบคุณสำหรับข้อมูล A3! กรุณากรอก A4 (ใช้ลูกแบดไปกี่ลูกคะ)`,
      });
    }

    if (event.message.text.startsWith('A4=')) {
      data.A4 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A5';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ ขอบคุณสำหรับข้อมูล A4! กรุณากรอก A5 (จำนวนผู้เล่นในรอบนี้มีใครบ้างคะ)`,
      });
    }

    if (event.message.text.startsWith('A5=')) {
      const players = event.message.text.split('=')[1].split(',').map(p => p.trim());
      data.A5 = players;

      const courtFee = data.A2 * 180;
      const bookingFee = data.A3;
      const shuttleFee = data.A4 * 85;
      const total = courtFee + bookingFee + shuttleFee;
      const perPerson = Math.round(total / players.length);

      let playerLines = players.map(p => {
        const name = playerMap[p] || p;
        return `${name} จ่าย ${perPerson} บาท 💰`;
      }).join('\n');

      const summary = `🎉 ว้าวว!! สุดยอดเลยค่ะ ขอบคุณสำหรับการมาออกกำลังกายนะคะ 🏸\n` +
                      `สำหรับค่าใช้จ่ายในการตีแบดครั้งนี้ ${total} บาทค่ะ 💸\n` +
                      `${playerLines}\n\n` +
                      `สามารถโอนเงินได้ที่ พร้อมเพย์ 0826721217 ได้เลยค่าาา 😄`;

      delete userStates[event.source.userId];

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: summary,
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ขออภัยค่ะ กรุณากรอกข้อมูลในรูปแบบที่น้องแบดตี้เข้าใจ เช่น A2=2 หรือ A5=P1,P2,P3`,
    });
  }
}

// ฟังก์ชันตรวจสอบลายเซ็นต์
function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return signature === hash;
}

// ใช้ middleware ตรวจสอบลายเซ็นต์
app.post('/api/webhook', verifySignature, line.middleware(config), (req, res) => {
  // ส่ง 200 OK ทันที เพื่อให้ LINE API ทราบว่าได้รับคำขอแล้ว
  res.status(200).end();

  // ประมวลผลคำขอในพื้นหลัง
  Promise.all(req.body.events.map(handleEvent))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();  // ส่งสถานะ 500 หากเกิดข้อผิดพลาด
    });
});

// เริ่มต้นเซิร์ฟเวอร์
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
