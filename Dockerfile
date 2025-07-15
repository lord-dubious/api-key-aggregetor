FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:18

RUN apt-get update && apt-get install -y xvfb

COPY . /workspace
WORKDIR /workspace

RUN npm install
RUN npm run compile

CMD ["npm", "test"]
