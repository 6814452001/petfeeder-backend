const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');

const config = {
  channelSecret: '3aaa68a43fbab44d55682e94e33ad904',
  channelAccessToken: 'Q6HL6BPXBNUOk0w/LJi1z5gsY8suwI6xp+eTDXlYoJGEtMn4nZdUl0J2osD9gngKOglND53ixoYcPY0dxqe8R49/eRFNYK7P1Kuvg6BoCbbjQiRf92OY667qMawKVqSe2u3VoCnjNKvS0lql8Fk0cAdB04t89/1O/w1cDnyilFU='
};

const app = express();
const client = new line.Client(config);
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  if (event.message.text === 'ให้อาหาร') {
    mqttClient.publish('petfeeder/PET-FEEDER-001/command', 'FEED');
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐱 ส่งคำสั่งให้อาหารเรียบร้อยแล้ว!'
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));