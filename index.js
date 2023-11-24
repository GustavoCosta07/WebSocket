const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connection = mysql.createConnection({
  host: "localhost",
  user: "user",
  password: "password",
  database: "mydb",
});

connection.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  } else {
    console.log("Conexão bem-sucedida ao banco de dados.");
  }
});


app.get('/updateAge', (req, res) => {

  const query = "SELECT idade FROM usuarios WHERE id = ?";

  connection.query(query, [3], (error, results) => {
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    } else {
      res.status(200).json(results[0]);
    }
  });
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const userData = JSON.parse(message);

    if (userData.type == "cadastro") {
      const insertQuery =
        "INSERT INTO usuarios (nome, telefone, username, idade, senha) VALUES (?, ?, ?, ?, ?)";
      const values = [
        userData.nome,
        userData.telefone,
        userData.username,
        userData.idade,
        userData.senha,
      ];

      connection.query(insertQuery, values, (error, results) => {
        if (error) {
          console.error("Erro ao inserir no banco de dados:", error);
          return;
        }

        const response = {
          greeting: `Olá, ${userData.username}, utilize seu usuário e senha para entrar no sistema.`,
          username: `Seu usuário é ${userData.username}.`,
          password: `Sua senha é ${userData.senha}.`,
        };

        ws.send(JSON.stringify(response));
      });
    }

    if (userData.type == "atualizarIdade") {

      const updateQuery = 'UPDATE usuarios SET idade = ? WHERE id = ?';


      const novaIdade = userData.novaIdade;

      connection.query(updateQuery, [novaIdade, 3], (error) => {
        if (error) {
          console.error('Erro ao atualizar a idade:', error);
        } else {
          console.log('Idade atualizada no banco de dados para:', novaIdade);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'novaIdade', idade: novaIdade }));
            }
          });
        }
      });
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor WebSocket está ouvindo na porta 3000");
});
