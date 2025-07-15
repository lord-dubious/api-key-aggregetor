import * as http from 'http';
import * as net from 'net';
import { URL } from 'url';

const proxy = http.createServer((req, res) => {
  console.log(`Proxy request received for: ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});

proxy.on('connect', (req, clientSocket, head) => {
  console.log(`Proxy connect received for: ${req.url}`);
  const { port, hostname } = new URL(`http://${req.url}`);
  const serverSocket = net.connect(Number(port) || 80, hostname, () => {
    console.log(`Proxy connected to: ${hostname}:${port}`);
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`Proxy error: ${err}`);
  });
});

export default proxy;
