#!/usr/bin/env python3
"""Minimal SMTP catcher: accepts any mail, dumps messages to /tmp/smtp_catch.log"""
import asyncio, sys, re

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1025
LOG = '/tmp/smtp_catch.log'

class Session:
    def __init__(self, reader, writer):
        self.r, self.w = reader, writer

    async def send(self, line):
        self.w.write((line + '\r\n').encode())
        await self.w.drain()

    async def handle(self):
        await self.send('220 catcher ESMTP')
        in_data = False
        msg_lines = []
        while True:
            try:
                raw = await asyncio.wait_for(self.r.readline(), timeout=60)
            except asyncio.TimeoutError:
                break
            if not raw:
                break
            line = raw.decode('utf-8', 'replace').rstrip('\r\n')
            if in_data:
                if line == '.':
                    in_data = False
                    with open(LOG, 'a') as f:
                        f.write('=== NEW MESSAGE ===\n' + '\n'.join(msg_lines) + '\n')
                    msg_lines = []
                    await self.send('250 OK queued')
                else:
                    msg_lines.append(re.sub(r'^\.\.', '.', line))
                continue
            cmd = line.split(' ')[0].upper()
            if cmd == 'EHLO':
                await self.send('250-catcher')
                await self.send('250-AUTH PLAIN LOGIN')
                await self.send('250 OK')
            elif cmd in ('HELO', 'MAIL', 'RCPT', 'RSET', 'NOOP'):
                if cmd == 'MAIL' and 'BODY=8BITMIME' in line.upper():
                    pass
                await self.send('250 OK')
            elif cmd == 'DATA':
                in_data = True
                await self.send('354 End data with <CR><LF>.<CR><LF>')
            elif cmd == 'QUIT':
                await self.send('221 Bye')
                break
            elif cmd == 'AUTH':
                await self.send('235 Authentication successful')
            else:
                await self.send('250 OK')
        try:
            self.w.close()
        except Exception:
            pass

async def main():
    server = await asyncio.start_server(lambda r, w: Session(r, w).handle(), '127.0.0.1', PORT)
    print(f'SMTP catcher on 127.0.0.1:{PORT}', flush=True)
    async with server:
        await server.serve_forever()

asyncio.run(main())
