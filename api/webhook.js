const line = require('@line/bot-sdk');
const crypto = require('crypto');

const CHANNEL_ACCESS_TOKEN = 'VDP6BNxp4IbJjVLe3MY73lghZwvqKeisykkmCxPLhhUV5xS5QFwt2fkIEWT6lvCOqX4P8Gusw4C+lrJrJEdMrrdYBQ3YJAQSm+hPyKVdiC97X9t7h9fOOhoyAHUbdhJYbaJnMsjyosvbxtQPFmmnTAdB04t89/1O/w1cDnyilFU=';
const CHANNEL_SECRET = 'b16b91dca7e1899f0f0945cad9bd8cae';

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET,
};

const client = new line.Client(config);

const userStates = {};

const playerMap = {
  P1: 'พี่อุ๊',
  P2: 'พี่ออม',
  P3: 'พี่คิง',
  P4: 'เจน',
  P5: 'เทพแห่งแบดกฤษ',
};

function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return signature === hash;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  if (event.message.text === 'น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า') {
    userStates[event.source.userId] = { step: 'A1', data: {} };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ยินดีค่าท่านเทพแบดกฤษ น้องแบดตี้จะสรุปค่าใช้จ่ายให้นะคะ\n` +
            `แต่ก่อนอื่น รบกวนท่านเทพแบดกฤษ กรอกข้อมูลให้น้องแบดตี้หน่อยนะคะ\n\n` +
            `A1=วันที่ตีแบดค่ะ`,
    });
  }

  const state = userStates[event.source.userId];
  if (state) {
    const { step, data } = state;

    if (event.message.text.startsWith('A1=')) {
      data.A1 = event.message.text.split('=')[1];
      state.step = 'A2';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `A2=จำนวนชั่วโมงที่เล่นแบดค่ะ`,
      });
    }

    if (event.message.text.startsWith('A2=')) {
      data.A2 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A3';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `A3=ค่าจองคอตรอบนี้เท่าไรคะ`,
      });
    }

    if (event.message.text.startsWith('A3=')) {
      data.A3 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A4';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `A4=ใช้ลูกแบดไปกี่ลูกคะ`,
      });
    }

    if (event.message.text.startsWith('A4=')) {
      data.A4 = parseInt(event.message.text.split('=')[1]);
      state.step = 'A5';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `A5=จำนวนผู้เล่นในรอบนี้มีใครบ้างคะ\n` +
              `P1=พี่อุ๊ P2=พี่ออม P3=พี่คิง P4=เจน P5=เทพแห่งแบดกฤษ\n\n` +
              `เช่น A5=P1,P2,P3`,
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
        return `${name} จ่าย ${perPerson} บาท`;
      }).join('\n');

      const summary = `ว้าวว!! สุดยอดเลยค่ะ ขอบคุณสำหรับการมาออกกำลังกายนะคะ\n` +
                      `สำหรับค่าใช้จ่ายในการตีแบดครั้งนี้ ${total} บาทค่ะ\n` +
                      `${playerLines}\n\nสามารถโอนเงินได้ที่ พร้อมเพย์ 0826721217 ได้เลยค่าาา`;

      delete userStates[event.source.userId];

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: summary,
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ขออภัยค่ะ กรุณากรอกในรูปแบบที่น้องแบดตี้เข้าใจ เช่น A2=2`,
    });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (!verifySignature(req)) {
    return res.status(400).send('Signature mismatch');
  }

  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));

    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};
