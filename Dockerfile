# Imagem base do Node
FROM node:20-alpine

# Pasta de trabalho dentro do container
WORKDIR /app

# Copia o seu index.js para dentro do container
COPY index.js .

# Cria um package.json básico e instala as dependências
RUN npm init -y && \
    npm install express axios form-data

# Porta em que o middleware vai rodar
EXPOSE 3000

# Comando para iniciar o app
CMD ["node", "index.js"]
