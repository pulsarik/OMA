// simple in-process bot interface
import WebSocket from 'ws';

export default class ExampleBot {
  ws: WebSocket;
  constructor(url = 'ws://localhost:4000') {
    this.ws = new WebSocket(url);
    this.ws.on('open', () => console.log('bot connected'));
    this.ws.on('message', (m) => {
      const msg = JSON.parse(m.toString());
      // naive: if a hand is dealt, log and optionally request full hand by id for analysis
      if (msg.type === 'hand_dealt' && msg.data?.id) {
        console.log('bot saw hand', msg.data.id);
        // for debug, request full hand
        this.ws.send(JSON.stringify({ action: 'replay', id: msg.data.id }));
      }
      if (msg.type === 'hand_full') {
        console.log('full hand for analysis', msg.data.id);
      }
    });
  }
}